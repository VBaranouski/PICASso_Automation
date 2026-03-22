"""
Release Notes generator.
Fetches JIRA version + issues, renders HTML and plain text, writes to output folder.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from src.clients.confluence_client import ConfluenceClient
from src.clients.jira_client import JiraClient, JiraIssue, JiraVersion
from src.config.settings import Settings
from src.utils.date_utils import format_jira_date, today_str
from src.utils.file_utils import ensure_dir, sanitize_filename, write_text


@dataclass
class ReleaseNotesContext:
    version: JiraVersion
    issues_by_type: dict[str, list[JiraIssue]]
    generated_date: str
    project_key: str
    total_issues: int


class ReleaseNotesGenerator:
    """Orchestrates JIRA data fetch → render → file output for Release Notes."""

    _STYLES = {"default", "hacker"}

    def __init__(
        self,
        jira: JiraClient,
        settings: Settings,
        confluence: Optional[ConfluenceClient] = None,
        style: str = "default",
    ) -> None:
        self._jira = jira
        self._settings = settings
        self._confluence = confluence
        self._style = style if style in self._STYLES else "default"
        self._jinja = Environment(
            loader=FileSystemLoader(settings.paths.templates_dir),
            autoescape=False,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(
        self,
        version_name: Optional[str] = None,
        project_key: Optional[str] = None,
        publish_to_confluence: bool = False,
        version_id: Optional[str] = None,
        release_date_override: Optional[str] = None,
    ) -> tuple[str, str]:
        """
        Full pipeline: fetch → render → write outputs.
        Returns (txt_filepath, html_filepath).
        Optionally publishes to Confluence if publish_to_confluence=True.
        Supply either version_name or version_id.
        """
        ctx = self._fetch_data(
            version_name,
            project_key or self._settings.jira.project_key,
            version_id=version_id,
            release_date_override=release_date_override,
        )

        html_content = self._render_html(ctx)
        txt_content = self._render_txt(ctx)

        txt_path, html_path = self._write_outputs(ctx, html_content, txt_content)

        if publish_to_confluence and self._confluence:
            page_title = f"Release Notes — {ctx.project_key} {ctx.version.name}"
            url = self._confluence.publish_release_notes(page_title, html_content)
            print(f"  Published to Confluence: {url}")

        return str(txt_path), str(html_path)

    def fetch_data(
        self,
        version_name: Optional[str] = None,
        project_key: Optional[str] = None,
        version_id: Optional[str] = None,
        release_date_override: Optional[str] = None,
    ) -> dict:
        """Fetch JIRA data and return as a JSON-serialisable dict for MCP-based workflows."""
        ctx = self._fetch_data(
            version_name,
            project_key or self._settings.jira.project_key,
            version_id=version_id,
            release_date_override=release_date_override,
        )
        return {
            "version_name": ctx.version.name,
            "version_description": ctx.version.description or "",
            "release_date": ctx.version.release_date or "",
            "released": ctx.version.released,
            "project_key": ctx.project_key,
            "total_issues": ctx.total_issues,
            "generated_date": ctx.generated_date,
            "issues_by_type": {
                itype: [
                    {
                        "key": i.key,
                        "summary": i.summary,
                        "status": i.status,
                        "priority": i.priority or "",
                        "issue_type": i.issue_type,
                        "assignee": i.assignee or "",
                    }
                    for i in issues
                ]
                for itype, issues in ctx.issues_by_type.items()
            },
        }

    def render_from_data(
        self,
        data: dict,
        publish_to_confluence: bool = False,
    ) -> tuple[str, str]:
        """Render HTML + TXT from a previously fetched data dict. Returns (txt_path, html_path)."""
        from src.clients.jira_client import JiraIssue, JiraVersion

        version = JiraVersion(
            id="",
            name=data["version_name"],
            description=data.get("version_description", ""),
            release_date=data.get("release_date", ""),
            released=data.get("released", False),
            project_key=data["project_key"],
        )
        issues_by_type: dict[str, list[JiraIssue]] = {}
        for itype, raw_issues in data.get("issues_by_type", {}).items():
            issues_by_type[itype] = [
                JiraIssue(
                    key=i["key"],
                    summary=i["summary"],
                    status=i["status"],
                    priority=i.get("priority") or "Medium",
                    issue_type=i["issue_type"],
                    assignee=i.get("assignee") or None,
                    description=None,
                    acceptance_criteria=None,
                )
                for i in raw_issues
            ]
        total = sum(len(v) for v in issues_by_type.values())
        ctx = ReleaseNotesContext(
            version=version,
            issues_by_type=issues_by_type,
            generated_date=data.get("generated_date", today_str(self._settings.output.date_format)),
            project_key=data["project_key"],
            total_issues=total,
        )
        html_content = self._render_html(ctx)
        txt_content = self._render_txt(ctx)
        txt_path, html_path = self._write_outputs(ctx, html_content, txt_content)
        if publish_to_confluence and self._confluence:
            page_title = f"Release Notes — {ctx.project_key} {ctx.version.name}"
            url = self._confluence.publish_release_notes(page_title, html_content)
            print(f"  Published to Confluence: {url}")
        return str(txt_path), str(html_path)

    # ------------------------------------------------------------------
    # Internal steps
    # ------------------------------------------------------------------

    def _fetch_data(
        self,
        version_name: Optional[str],
        project_key: str,
        version_id: Optional[str] = None,
        release_date_override: Optional[str] = None,
    ) -> ReleaseNotesContext:
        if version_id:
            print(f"  Fetching version ID '{version_id}' from JIRA...")
            version = self._jira.get_version_by_id(version_id)
            if not version.project_key:
                version.project_key = project_key
            version_name = version.name
        else:
            print(f"  Fetching version '{version_name}' from JIRA project '{project_key}'...")
            version = self._jira.get_version_by_name(version_name, project_key)

        print(f"  Fetching issues for version '{version_name}'...")
        issues_by_type = self._jira.get_issues_by_version(version_name, version.project_key or project_key)

        total = sum(len(v) for v in issues_by_type.values())
        print(f"  Found {total} issues across {len(issues_by_type)} types.")

        # Apply release date override or format what came from JIRA
        if release_date_override:
            version.release_date = release_date_override
        else:
            version.release_date = format_jira_date(version.release_date)

        effective_project_key = version.project_key or project_key
        return ReleaseNotesContext(
            version=version,
            issues_by_type=issues_by_type,
            generated_date=today_str(self._settings.output.date_format),
            project_key=effective_project_key,
            total_issues=total,
        )

    def _render_html(self, ctx: ReleaseNotesContext) -> str:
        template_name = "release_notes_short.html.j2" if self._style == "default" else f"release_notes_short_{self._style}.html.j2"
        template = self._jinja.get_template(template_name)

        release_type = self._get_release_type(ctx.version.name)

        # Group all issues by priority
        defect_types = {"bug", "defect"}
        high_issues: list = []
        medium_issues: list = []
        low_issues: list = []
        feature_issues: list = []

        for issues in ctx.issues_by_type.values():
            for issue in issues:
                if issue.issue_type.lower() in defect_types:
                    p = (issue.priority or "medium").lower()
                    if p in ("highest", "high", "critical", "blocker"):
                        high_issues.append(issue)
                    elif p in ("low", "lowest", "minor", "trivial"):
                        low_issues.append(issue)
                    else:
                        medium_issues.append(issue)
                else:
                    feature_issues.append(issue)

        all_issues = high_issues + medium_issues + low_issues + feature_issues
        n = len(all_issues)
        fix_count = len(high_issues) + len(medium_issues) + len(low_issues)
        feat_count = len(feature_issues)

        parts = []
        if feat_count:
            parts.append(f"{feat_count} new feature{'s' if feat_count != 1 else ''}")
        if fix_count:
            parts.append(f"{fix_count} defect fix{'es' if fix_count != 1 else ''}")

        intro_text = (
            f"We are pleased to announce the successful deployment of the "
            f"<strong>{ctx.project_key} {release_type} {ctx.version.name}</strong>. "
            f"This release delivers " + " and ".join(parts) + "."
            if parts else
            f"We are pleased to announce the successful deployment of the "
            f"<strong>{ctx.project_key} {release_type} {ctx.version.name}</strong>."
        )

        tag_map = {
            "Hotfix": f"#{ctx.project_key} &nbsp;#Release &nbsp;#HotFix",
            "Enhancement Release": f"#{ctx.project_key} &nbsp;#Release &nbsp;#Enhancement",
            "Release Candidate": f"#{ctx.project_key} &nbsp;#Release &nbsp;#ReleaseCandidate",
        }
        hashtags = tag_map.get(release_type, f"#{ctx.project_key} &nbsp;#Release")

        closing_text = (
            f"Thank you to the team for the fast turnaround on this {release_type.lower()}! "
            f"If you encounter any issues, please reach out to the {ctx.project_key} support team."
        )

        return template.render(
            version=ctx.version,
            issues_by_type=ctx.issues_by_type,
            high_issues=high_issues,
            medium_issues=medium_issues,
            low_issues=low_issues,
            feature_issues=feature_issues,
            release_type=release_type,
            intro_text=intro_text,
            hashtags=hashtags,
            closing_text=closing_text,
            generated_date=ctx.generated_date,
            project_key=ctx.project_key,
            total_issues=ctx.total_issues,
            branding=self._settings.branding,
        )

    @staticmethod
    def _get_release_type(version_name: str) -> str:
        name = version_name.upper()
        if "HOTFIX" in name or "HOT-FIX" in name:
            return "Hotfix"
        if name.startswith("ER-"):
            return "Enhancement Release"
        if "-RC-" in name or name.startswith("RC-"):
            return "Release Candidate"
        return "Release"

    def _render_txt(self, ctx: ReleaseNotesContext) -> str:
        lines: list[str] = []
        sep = "=" * 60

        lines += [
            sep,
            f"RELEASE NOTES — {ctx.version.name}",
            f"Project: {ctx.project_key}",
            f"Release Date: {ctx.version.release_date or 'TBD'}",
            f"Status: {'Released' if ctx.version.released else 'Unreleased'}",
            f"Generated: {ctx.generated_date}",
            sep,
            "",
        ]

        if ctx.version.description:
            lines += [f"Description: {ctx.version.description}", ""]

        lines += [f"Total Issues: {ctx.total_issues}", ""]

        for type_name in ["Bug", "Story", "Task", "Improvement"]:
            issues = ctx.issues_by_type.get(type_name, [])
            if not issues:
                continue
            lines += [f"--- {type_name}s ({len(issues)}) ---", ""]
            for issue in issues:
                assignee = f"  Assignee: {issue.assignee}" if issue.assignee else ""
                lines.append(f"  [{issue.key}] {issue.summary}")
                lines.append(f"  Status: {issue.status}{assignee}")
                lines.append("")

        # Any remaining types
        for type_name, issues in ctx.issues_by_type.items():
            if type_name in ["Bug", "Story", "Task", "Improvement"] or not issues:
                continue
            lines += [f"--- {type_name}s ({len(issues)}) ---", ""]
            for issue in issues:
                lines.append(f"  [{issue.key}] {issue.summary}")
                lines.append(f"  Status: {issue.status}")
                lines.append("")

        lines += [sep, f"Generated by SE-DevTools — {self._settings.branding.company_name}"]
        return "\n".join(lines)

    def _write_outputs(
        self, ctx: ReleaseNotesContext, html: str, txt: str
    ) -> tuple[Path, Path]:
        safe_version = sanitize_filename(ctx.version.name)
        base_name = self._settings.output.release_notes_short_filename_pattern.format(
            project=ctx.project_key,
            version=safe_version,
            date=ctx.generated_date,
        )

        out_dir = ensure_dir(self._settings.paths.output_release_notes_short)

        txt_path = write_text(txt, out_dir / f"{base_name}.txt")
        html_path = write_text(html, out_dir / f"{base_name}.html")

        return txt_path, html_path
