"""
Executive Email Summary generator.
Produces a short, SVP/VP-ready HTML status email based on the bug/defect report data.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path

import jinja2

from src.clients.jira_client import JiraClient, JiraIssue
from src.config.settings import Settings
from src.generators.bug_report import BugReportGenerator, _sort_by_priority


_OPEN_STATUSES = {
    "open", "to do", "todo", "new", "reopened",
    "in progress", "in development", "in review", "under review",
}


def _is_open(issue: JiraIssue) -> bool:
    sl = issue.status.lower()
    return sl in _OPEN_STATUSES or "progress" in sl or "review" in sl


def _is_critical(issue: JiraIssue) -> bool:
    return issue.priority.lower() in ("blocker", "critical", "high")


@dataclass
class SectionStats:
    label: str
    issue_type_label: str
    period: str
    total: int
    open: int
    closed: int
    critical: int


class EmailSummaryGenerator:
    """Generate a short executive email HTML summary from JIRA defect data."""

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
        """Fetch data, compute stats, write HTML. Returns output path."""
        today = date.today().strftime(self._settings.output.date_format)
        bg = BugReportGenerator(self._jira, self._settings)

        sit, uat, prod = self._fetch(bg)

        stats = [
            self._stats("SIT Testing Defects",  "Bugs & Defects", "Jan 19, 2026", sit),
            self._stats("UAT Bugs",              "Bugs",           "Jan 19, 2026", uat),
            self._stats("Production Defects",    "Defects",        "Jan 19, 2026", prod),
        ]

        all_issues = sit + uat + prod
        total_open     = sum(s.open     for s in stats)
        total_closed   = sum(s.closed   for s in stats)
        total_critical = sum(s.critical for s in stats)
        total_all      = sum(s.total    for s in stats)

        # Collect the top open+critical issues (up to 5) for the highlights block
        top_open_critical = [
            i for i in all_issues if _is_open(i) and _is_critical(i)
        ][:5]

        html = self._render(
            stats, total_all, total_open, total_closed, total_critical,
            top_open_critical, today,
        )

        out_dir = Path(self._settings.paths.output_bug_reports)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"email_summary_{today}.html"
        out_path.write_text(html, encoding="utf-8")
        return str(out_path)

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _fetch(
        self, bg: BugReportGenerator
    ) -> tuple[list[JiraIssue], list[JiraIssue], list[JiraIssue]]:
        sit_ids   = ", ".join(bg._SIT_REPORTERS)
        uat_ids   = ", ".join(bg._UAT_REPORTERS)
        uat_or    = " ".join(f'OR reporter = "{n}"' for n in bg._UAT_DISPLAY_REPORTERS)
        prod_or   = " OR ".join(f'reporter = "{n}"' for n in bg._PROD_DISPLAY_REPORTERS)

        sit  = _sort_by_priority(self._jira.search_issues(
            f'issuetype in (Bug, Defect) AND reporter in ({sit_ids}) '
            f'AND created >= "{bg._SIT_START}" ORDER BY created DESC'
        ))
        uat  = _sort_by_priority(self._jira.search_issues(
            f'issuetype = Bug AND (reporter in ({uat_ids}) {uat_or}) '
            f'AND created >= "{bg._UAT_START}" ORDER BY created DESC'
        ))
        prod = _sort_by_priority(self._jira.search_issues(
            f'issuetype = Defect AND ({prod_or}) '
            f'AND created >= "{bg._PROD_START}" ORDER BY created DESC'
        ))
        return sit, uat, prod

    @staticmethod
    def _stats(
        label: str, type_label: str, period: str, issues: list[JiraIssue]
    ) -> SectionStats:
        open_c    = sum(1 for i in issues if _is_open(i))
        critical  = sum(1 for i in issues if _is_critical(i))
        return SectionStats(
            label=label,
            issue_type_label=type_label,
            period=period,
            total=len(issues),
            open=open_c,
            closed=len(issues) - open_c,
            critical=critical,
        )

    def _render(
        self,
        stats: list[SectionStats],
        total_all: int,
        total_open: int,
        total_closed: int,
        total_critical: int,
        top_critical: list[JiraIssue],
        today: str,
    ) -> str:
        template = self._jinja.get_template("email_summary.html.j2")
        return template.render(
            stats=stats,
            total_all=total_all,
            total_open=total_open,
            total_closed=total_closed,
            total_critical=total_critical,
            top_critical=top_critical,
            generated_date=today,
            branding=self._settings.branding,
        )
