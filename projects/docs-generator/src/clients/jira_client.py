"""
JIRA REST API v2 client (Server / Data Center).
Authentication: Authorization: Basic <pre-encoded-base64-token>
  — the token stored in .env is already base64(username:PAT), used directly.
Uses API v2 (not v3 — this instance is JIRA Server, not Atlassian Cloud).
SSL verification disabled for internal corporate certificate.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field
from typing import Optional

import requests
from urllib3.exceptions import InsecureRequestWarning

from src.config.settings import JiraConfig

warnings.filterwarnings("ignore", category=InsecureRequestWarning)


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

@dataclass
class JiraVersion:
    id: str
    name: str
    description: str
    release_date: Optional[str]
    released: bool
    project_key: str


@dataclass
class JiraIssue:
    key: str
    summary: str
    issue_type: str
    status: str
    assignee: Optional[str]
    description: Optional[str]
    acceptance_criteria: Optional[str]
    fix_versions: list[str] = field(default_factory=list)
    story_points: Optional[float] = None
    priority: str = "Medium"
    reporter: Optional[str] = None
    created: Optional[str] = None
    parent_story_key: Optional[str] = None
    parent_story_summary: Optional[str] = None


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class JiraClient:
    """Thin wrapper around JIRA REST API v2 (Server / Data Center)."""

    def __init__(self, config: JiraConfig) -> None:
        import base64
        self._config = config
        self._base = f"{config.base_url}/rest/api/2"
        self._session = requests.Session()
        # Build Basic auth from raw PAT: base64(email:api_token)
        encoded = base64.b64encode(f"{config.email}:{config.api_token}".encode()).decode()
        self._session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {encoded}",
        })

    # ------------------------------------------------------------------
    # Versions
    # ------------------------------------------------------------------

    def get_versions(self, project_key: Optional[str] = None) -> list[JiraVersion]:
        """Return all versions for a project, ordered by sequence."""
        key = project_key or self._config.project_key
        data = self._get(f"/project/{key}/versions")
        return [self._parse_version(v, key) for v in data]

    def get_version_by_id(self, version_id: str) -> JiraVersion:
        """Fetch a version directly by its numeric ID."""
        raw = self._get(f"/version/{version_id}")
        project_key = raw.get("projectId", "")
        # Resolve project key from the version's self URL or project field
        raw_key = raw.get("project", "") or self._config.project_key
        return self._parse_version(raw, raw_key)

    def get_version_by_name(self, version_name: str, project_key: Optional[str] = None) -> JiraVersion:
        """Find a specific version by name. Raises ValueError if not found."""
        versions = self.get_versions(project_key)
        for v in versions:
            if v.name.lower() == version_name.lower():
                return v
        raise ValueError(
            f"Version '{version_name}' not found in project "
            f"'{project_key or self._config.project_key}'."
        )

    # ------------------------------------------------------------------
    # Issues
    # ------------------------------------------------------------------

    def get_issues_by_version(
        self,
        version_name: str,
        project_key: Optional[str] = None,
        issue_types: Optional[list[str]] = None,
    ) -> dict[str, list[JiraIssue]]:
        """
        Fetch ALL issues in a given version (no type filter), grouped by issue type.
        issue_types parameter is ignored — all types actually present are returned.
        Returns e.g. {'Defect': [...], 'Story': [...], 'Task': [...]}
        """
        key = project_key or self._config.project_key

        jql = (
            f'project = "{key}" '
            f'AND fixVersion = "{version_name}" '
            f'ORDER BY issuetype ASC, key ASC'
        )

        raw_issues = self._search_issues(jql)
        grouped: dict[str, list[JiraIssue]] = {}
        for raw in raw_issues:
            issue = self._parse_issue(raw)
            grouped.setdefault(issue.issue_type, []).append(issue)

        return grouped

    def search_issues(self, jql: str, max_results: int = 500) -> list[JiraIssue]:
        """Execute arbitrary JQL and return a list of parsed JiraIssue objects."""
        raw = self._search_issues(jql, max_results=max_results)
        return [self._parse_issue(r) for r in raw]

    def get_story(self, story_id: str) -> JiraIssue:
        """Fetch a single issue (user story) by its key, e.g. PROJ-123."""
        fields_param = ",".join(self._config.fields_to_fetch)
        data = self._get(f"/issue/{story_id}", params={"fields": fields_param})
        return self._parse_issue(data)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _search_issues(self, jql: str, max_results: int = 500) -> list[dict]:
        """Execute a JQL search with pagination. Returns raw JIRA issue dicts."""
        issues: list[dict] = []
        start_at = 0
        page_size = 100

        while True:
            payload = {
                "jql": jql,
                "startAt": start_at,
                "maxResults": min(page_size, max_results - len(issues)),
                "fields": self._config.fields_to_fetch,
            }
            resp = self._post("/search", json=payload)
            batch = resp.get("issues", [])
            issues.extend(batch)

            if len(batch) < page_size or len(issues) >= max_results:
                break
            start_at += len(batch)

        return issues

    def _get(self, endpoint: str, params: Optional[dict] = None) -> dict | list:
        url = self._base + endpoint
        resp = self._session.get(url, params=params, timeout=30, verify=False)
        resp.raise_for_status()
        return resp.json()

    def _post(self, endpoint: str, json: dict) -> dict:
        url = self._base + endpoint
        resp = self._session.post(url, json=json, timeout=30, verify=False)
        resp.raise_for_status()
        return resp.json()

    def _parse_version(self, raw: dict, project_key: str) -> JiraVersion:
        return JiraVersion(
            id=raw.get("id", ""),
            name=raw.get("name", ""),
            description=raw.get("description", ""),
            release_date=raw.get("releaseDate"),
            released=raw.get("released", False),
            project_key=project_key,
        )

    def _parse_issue(self, raw: dict) -> JiraIssue:
        fields = raw.get("fields", {})

        assignee_field = fields.get("assignee")
        assignee = (
            assignee_field.get("displayName") if assignee_field else None
        )

        description_field = fields.get("description")
        description = self._extract_text(description_field)

        # Acceptance criteria — often a custom field; extract if present
        ac_field = fields.get("customfield_10014")
        acceptance_criteria = self._extract_text(ac_field)

        fix_versions = [
            v.get("name", "") for v in fields.get("fixVersions", [])
        ]

        story_points = fields.get("customfield_10016")

        priority_field = fields.get("priority")
        priority = priority_field.get("name", "Medium") if priority_field else "Medium"

        reporter_field = fields.get("reporter")
        reporter = reporter_field.get("displayName") if reporter_field else None

        created_raw = fields.get("created", "")
        created = created_raw[:10] if created_raw else None

        # Parent story — check direct `parent` field first, then issue links
        _story_types = {"story", "feature", "epic", "user story"}
        parent_story_key: Optional[str] = None
        parent_story_summary: Optional[str] = None

        parent_field = fields.get("parent")
        if parent_field:
            ptype = parent_field.get("fields", {}).get("issuetype", {}).get("name", "")
            if ptype.lower() in _story_types:
                parent_story_key = parent_field.get("key")
                parent_story_summary = parent_field.get("fields", {}).get("summary", "")

        if not parent_story_key:
            for link in fields.get("issuelinks", []):
                for direction in ("inwardIssue", "outwardIssue"):
                    linked = link.get(direction)
                    if not linked:
                        continue
                    ltype = linked.get("fields", {}).get("issuetype", {}).get("name", "")
                    if ltype.lower() in _story_types:
                        parent_story_key = linked.get("key")
                        parent_story_summary = linked.get("fields", {}).get("summary", "")
                        break
                if parent_story_key:
                    break

        return JiraIssue(
            key=raw.get("key", ""),
            summary=fields.get("summary", ""),
            issue_type=fields.get("issuetype", {}).get("name", "Unknown"),
            status=fields.get("status", {}).get("name", "Unknown"),
            assignee=assignee,
            description=description,
            acceptance_criteria=acceptance_criteria,
            fix_versions=fix_versions,
            story_points=story_points,
            priority=priority,
            reporter=reporter,
            created=created,
            parent_story_key=parent_story_key,
            parent_story_summary=parent_story_summary,
        )

    def get_issue_attachments(self, issue_key: str) -> list[dict]:
        """Return list of attachments for a JIRA issue."""
        url = f"{self.base_url}/rest/api/2/issue/{issue_key}?fields=attachment"
        r = self._session.get(url)
        r.raise_for_status()
        return r.json().get("fields", {}).get("attachment", [])

    def download_attachment(self, content_url: str) -> bytes:
        """Download attachment bytes by content URL."""
        r = self._session.get(content_url)
        r.raise_for_status()
        return r.content

    def _extract_text(self, field_value) -> Optional[str]:
        """
        Extract plain text from a JIRA Atlassian Document Format (ADF) field
        or return the raw string if it's already a string.
        """
        if field_value is None:
            return None
        if isinstance(field_value, str):
            return field_value
        if isinstance(field_value, dict):
            return self._adf_to_text(field_value)
        return str(field_value)

    def _adf_to_text(self, node: dict, depth: int = 0) -> str:
        """Recursively extract plain text from an ADF node tree."""
        node_type = node.get("type", "")
        content = node.get("content", [])
        text = node.get("text", "")

        if node_type == "text":
            return text

        parts = [self._adf_to_text(child, depth + 1) for child in content]
        joined = " ".join(p for p in parts if p.strip())

        if node_type in ("paragraph", "heading"):
            return joined + "\n"
        if node_type == "listItem":
            return f"• {joined}\n"
        return joined
