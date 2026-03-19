"""
Bug & Defect Report generator.
Fetches three groups of issues from JIRA via JQL and renders an HTML report.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

import jinja2

from src.clients.jira_client import JiraClient, JiraIssue
from src.config.settings import Settings


_PRIORITY_ORDER = {"blocker": 0, "critical": 1, "high": 2, "medium": 3, "low": 4}


def _sort_by_priority(issues: list[JiraIssue]) -> list[JiraIssue]:
    return sorted(issues, key=lambda i: _PRIORITY_ORDER.get(i.priority.lower(), 5))


class BugReportGenerator:
    """Generate a three-section bug/defect HTML report from JIRA."""

    _SIT_START  = "2026-01-19"
    _UAT_START  = "2026-01-19"
    _PROD_START = "2026-01-19"

    # SIT testers (by SESA ID)
    _SIT_REPORTERS = ["SESA828373", "SESA826798"]
    # UAT testers (by SESA ID)
    _UAT_REPORTERS = ["SESA815931", "SESA833942"]
    # UAT testers by display name
    _UAT_DISPLAY_REPORTERS = ["Maryna Shykova", "Halyna Panchenko", "Iryna Kovlyha"]
    # Production reporters by display name
    _PROD_DISPLAY_REPORTERS = [
        "Halyna Panchenko", "Maryna Shykova", "Iryna Kovlyha",
        "Ganna Naser Aldeen", "Anastasiia Akinfiieva",
    ]

    _STYLES = {"default", "hacker"}

    def __init__(self, jira: JiraClient, settings: Settings, style: str = "default") -> None:
        self._jira = jira
        self._settings = settings
        self._style = style if style in self._STYLES else "default"
        self._jinja = jinja2.Environment(
            loader=jinja2.FileSystemLoader(settings.paths.templates_dir),
            autoescape=True,
        )

    # ------------------------------------------------------------------
    # Public
    # ------------------------------------------------------------------

    def generate(self) -> str:
        """Fetch issues from JIRA and write the HTML report. Returns the output path."""
        today = date.today().strftime(self._settings.output.date_format)

        sit_ids = ", ".join(self._SIT_REPORTERS)
        uat_ids = ", ".join(self._UAT_REPORTERS)
        uat_names_or = " ".join(
            f'OR reporter = "{n}"' for n in self._UAT_DISPLAY_REPORTERS
        )
        prod_names = " OR ".join(
            f'reporter = "{n}"' for n in self._PROD_DISPLAY_REPORTERS
        )

        sit_jql = (
            "issuetype in (Bug, Defect) "
            f"AND reporter in ({sit_ids}) "
            f'AND created >= "{self._SIT_START}" '
            "ORDER BY created DESC"
        )
        uat_jql = (
            "issuetype = Bug "
            f"AND (reporter in ({uat_ids}) {uat_names_or}) "
            f'AND created >= "{self._UAT_START}" '
            "ORDER BY created DESC"
        )
        prod_jql = (
            "issuetype = Defect "
            f"AND ({prod_names}) "
            f'AND created >= "{self._PROD_START}" '
            "ORDER BY created DESC"
        )

        print("  Fetching SIT defects ...")
        sit_issues = _sort_by_priority(self._jira.search_issues(sit_jql))
        print(f"    -> {len(sit_issues)} issue(s) found.")

        if self._UAT_REPORTERS or self._UAT_DISPLAY_REPORTERS:
            print("  Fetching UAT defects ...")
            uat_issues = _sort_by_priority(self._jira.search_issues(uat_jql))
            print(f"    -> {len(uat_issues)} issue(s) found.")
        else:
            print("  UAT section — no reporters configured, skipping.")
            uat_issues: list = []

        print("  Fetching Production defects ...")
        prod_issues = _sort_by_priority(self._jira.search_issues(prod_jql))
        print(f"    -> {len(prod_issues)} issue(s) found.")

        html = self._render_html(sit_issues, uat_issues, prod_issues, today)

        out_dir = Path(self._settings.paths.output_bug_reports)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"bug_defect_report_{today}.html"
        out_path.write_text(html, encoding="utf-8")

        return str(out_path)

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _render_html(
        self,
        sit: list[JiraIssue],
        uat: list[JiraIssue],
        prod: list[JiraIssue],
        today: str,
    ) -> str:
        template = self._jinja.get_template(f"bug_report_{self._style}.html.j2")
        return template.render(
            sit_issues=sit,
            uat_issues=uat,
            prod_issues=prod,
            sit_reporters=self._SIT_REPORTERS,
            uat_reporters=self._UAT_REPORTERS + self._UAT_DISPLAY_REPORTERS,
            prod_reporters=self._PROD_DISPLAY_REPORTERS,
            sit_period="Jan 19, 2026",
            uat_period="Jan 19, 2026",
            prod_period="Jan 19, 2026",
            generated_date=today,
            branding=self._settings.branding,
        )
