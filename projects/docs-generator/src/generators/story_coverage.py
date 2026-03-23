"""
Story Coverage Summary generator.
Reuses the same defect queries as BugReportGenerator and groups
results by the parent User Story / Feature to show testing coverage.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import jinja2

from src.clients.jira_client import JiraClient, JiraIssue
from src.config.settings import Settings
from src.generators.bug_report import BugReportGenerator, _sort_by_priority


@dataclass
class StoryCoverage:
    key: str
    summary: str
    sit_defects: list[JiraIssue] = field(default_factory=list)
    uat_defects: list[JiraIssue] = field(default_factory=list)
    prod_defects: list[JiraIssue] = field(default_factory=list)

    @property
    def total(self) -> int:
        return len(self.sit_defects) + len(self.uat_defects) + len(self.prod_defects)


class StoryCoverageGenerator:
    """Generate a compact HTML story-coverage summary from JIRA defect data."""

    def __init__(self, jira: JiraClient, settings: Settings) -> None:
        self._jira = jira
        self._settings = settings
        self._jinja = jinja2.Environment(
            loader=jinja2.FileSystemLoader(settings.paths.templates_dir),
            autoescape=True,
        )

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def generate(self) -> str:
        """Fetch defects, compute coverage, write HTML. Returns output path."""
        today = date.today().strftime(self._settings.output.date_format)
        gen = BugReportGenerator(self._jira, self._settings)

        sit_issues, uat_issues, prod_issues = self._fetch_issues(gen)

        stories: dict[str, StoryCoverage] = {}
        unlinked_sit: list[JiraIssue] = []
        unlinked_uat: list[JiraIssue] = []
        unlinked_prod: list[JiraIssue] = []

        def _add(issues: list[JiraIssue], section: str,
                 unlinked: list[JiraIssue]) -> None:
            for issue in issues:
                if issue.parent_story_key:
                    key = issue.parent_story_key
                    if key not in stories:
                        stories[key] = StoryCoverage(
                            key=key,
                            summary=issue.parent_story_summary or "",
                        )
                    getattr(stories[key], f"{section}_defects").append(issue)
                else:
                    unlinked.append(issue)

        _add(sit_issues,  "sit",  unlinked_sit)
        _add(uat_issues,  "uat",  unlinked_uat)
        _add(prod_issues, "prod", unlinked_prod)

        sorted_stories = sorted(
            stories.values(), key=lambda s: s.total, reverse=True
        )

        html = self._render_html(
            sorted_stories,
            sit_issues, uat_issues, prod_issues,
            unlinked_sit, unlinked_uat, unlinked_prod,
            today,
        )

        out_dir = Path(self._settings.paths.output_bug_reports)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"story_coverage_summary_{today}.html"
        out_path.write_text(html, encoding="utf-8")
        return str(out_path)

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _fetch_issues(
        self, gen: BugReportGenerator
    ) -> tuple[list[JiraIssue], list[JiraIssue], list[JiraIssue]]:
        """Re-use BugReportGenerator's JQL logic to fetch the three issue groups."""
        ids_in = ", ".join(gen._SIT_REPORTERS)
        uat_ids_in = ", ".join(gen._UAT_REPORTERS)
        uat_names_or = " ".join(
            f'OR reporter = "{n}"' for n in gen._UAT_DISPLAY_REPORTERS
        )

        sit_jql = (
            "issuetype in (Bug, Defect) "
            f"AND reporter in ({ids_in}) "
            'AND created >= "2026-01-01" ORDER BY created DESC'
        )
        uat_jql = (
            "issuetype in (Bug, Defect) "
            f"AND (reporter in ({uat_ids_in}) {uat_names_or}) "
            'AND created >= "2026-02-01" ORDER BY created DESC'
        )
        prod_jql = (
            "issuetype in (Bug, Defect) "
            f'AND reporter = "{gen._PROD_REPORTER}" '
            'AND created >= "2026-02-01" ORDER BY created DESC'
        )

        print("  Fetching SIT defects ...")
        sit = _sort_by_priority(self._jira.search_issues(sit_jql))
        print(f"    -> {len(sit)} issue(s).")

        print("  Fetching UAT defects ...")
        uat = _sort_by_priority(self._jira.search_issues(uat_jql))
        print(f"    -> {len(uat)} issue(s).")

        print("  Fetching Production defects ...")
        prod = _sort_by_priority(self._jira.search_issues(prod_jql))
        print(f"    -> {len(prod)} issue(s).")

        return sit, uat, prod

    def _render_html(
        self,
        stories: list[StoryCoverage],
        sit: list[JiraIssue],
        uat: list[JiraIssue],
        prod: list[JiraIssue],
        unlinked_sit: list[JiraIssue],
        unlinked_uat: list[JiraIssue],
        unlinked_prod: list[JiraIssue],
        today: str,
    ) -> str:
        template = self._jinja.get_template("story_coverage.html.j2")
        return template.render(
            stories=stories,
            total_sit=len(sit),
            total_uat=len(uat),
            total_prod=len(prod),
            total_defects=len(sit) + len(uat) + len(prod),
            unlinked_sit=len(unlinked_sit),
            unlinked_uat=len(unlinked_uat),
            unlinked_prod=len(unlinked_prod),
            generated_date=today,
            branding=self._settings.branding,
        )
