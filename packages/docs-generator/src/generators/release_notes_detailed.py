"""
Full Release Notes generator (AI-powered, PICASso format).

Two-phase pipeline:
  Phase 1 — fetch_data(): JIRA version + issues + spec file → release_data dict
  Phase 2 — render_from_body(): AI-generated HTML body + release_data → final HTML file

AI generation is handled by the calling skill (Claude Code as Technical Writer).
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from src.clients.confluence_client import ConfluenceClient
from src.clients.jira_client import JiraClient
from src.config.settings import Settings
from src.utils.date_utils import format_jira_date, today_str
from src.utils.file_utils import ensure_dir, read_text, sanitize_filename, write_text

_TEMPLATE_FILE = Path("output/release_notes_detailed/template/release_notes_template.md")


class FullReleaseNotesGenerator:
    """AI-powered full release notes generator following the PICASso document format."""

    def __init__(
        self,
        jira: JiraClient,
        settings: Settings,
        confluence: Optional[ConfluenceClient] = None,
    ) -> None:
        self._jira = jira
        self._settings = settings
        self._confluence = confluence
        self._jinja = Environment(
            loader=FileSystemLoader(settings.paths.templates_dir),
            autoescape=False,
        )

    # ------------------------------------------------------------------
    # Phase 1: Fetch release data
    # ------------------------------------------------------------------

    def fetch_data(
        self,
        version_name: str,
        project_key: Optional[str] = None,
        spec_filename: Optional[str] = None,
    ) -> dict:
        """
        Fetch JIRA version, issues, and optional spec file.
        Returns a JSON-serialisable dict for passing to the skill.
        """
        key = project_key or self._settings.jira.project_key

        template_content = self._load_template()

        print(f"  Fetching version '{version_name}' from JIRA project '{key}'...")
        version = self._jira.get_version_by_name(version_name, key)
        version.release_date = format_jira_date(version.release_date)

        print(f"  Fetching all issues for version '{version_name}'...")
        issues_by_type = self._jira.get_issues_by_version(version_name, key)
        total = sum(len(v) for v in issues_by_type.values())
        print(f"  Found {total} issues across {len(issues_by_type)} type(s).")

        # Serialise issues as plain dicts
        issues_serialised: dict[str, list[dict]] = {}
        for itype, issues in issues_by_type.items():
            issues_serialised[itype] = [
                {
                    "key": i.key,
                    "summary": i.summary,
                    "status": i.status,
                    "assignee": i.assignee or "",
                    "description": (i.description or "").strip().replace("\n", " ")[:300],
                }
                for i in issues
            ]

        # Load spec file
        spec_content = ""
        if spec_filename:
            spec_path = Path(self._settings.paths.input_release_notes_detailed) / spec_filename
            if not spec_path.exists():
                raise FileNotFoundError(
                    f"Spec file not found: {spec_path}\n"
                    f"Place it in '{self._settings.paths.input_release_notes_detailed}/'."
                )
            spec_content = read_text(spec_path)
            print(f"  Loaded spec file: {spec_filename}")
        else:
            input_dir = Path(self._settings.paths.input_release_notes_detailed)
            candidates = [
                f for f in input_dir.iterdir()
                if f.is_file() and f.suffix.lower() in (".txt", ".md") and not f.name.startswith(".")
            ]
            if candidates:
                spec_content = read_text(candidates[0])
                print(f"  Auto-loaded spec file: {candidates[0].name}")

        return {
            "version_name": version_name,
            "project_key": key,
            "release_date": version.release_date or "TBD",
            "total_issues": total,
            "issues_by_type": issues_serialised,
            "spec_content": spec_content,
            "template_content": template_content,
        }

    # ------------------------------------------------------------------
    # Phase 2: Render from AI-generated HTML body
    # ------------------------------------------------------------------

    def render_from_body(
        self,
        release_data: dict,
        html_body: str,
        publish_to_confluence: bool = False,
    ) -> str:
        """
        Wrap the AI-generated HTML body in the SE-branded shell template.
        Returns the html_filepath.
        """
        version_name = release_data["version_name"]
        project_key = release_data["project_key"]

        print(f"  Rendering HTML shell for {project_key} {version_name}...")
        html_full = self._render_shell(
            version_name=version_name,
            project_key=project_key,
            release_date=release_data.get("release_date", "TBD"),
            total_issues=release_data.get("total_issues", 0),
            html_body=html_body,
        )
        html_path = self._write_output(version_name, project_key, html_full)
        print(f"  Written: {html_path}")

        if publish_to_confluence and self._confluence:
            page_title = f"Full Release Notes - {project_key} {version_name}"
            url = self._confluence.publish_release_notes(page_title, html_full)
            print(f"  Published to Confluence: {url}")

        return str(html_path)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load_template(self) -> str:
        if not _TEMPLATE_FILE.exists():
            raise FileNotFoundError(
                f"Template file not found: {_TEMPLATE_FILE}\n"
                "Expected: output/release_notes_detailed/template/release_notes_template.md"
            )
        return read_text(_TEMPLATE_FILE)

    def _render_shell(self, version_name: str, project_key: str, release_date: str, total_issues: int, html_body: str) -> str:
        template = self._jinja.get_template("release_notes_detailed.html.j2")
        return template.render(
            version_name=version_name,
            project_key=project_key,
            release_date=release_date,
            total_issues=total_issues,
            generated_date=today_str(self._settings.output.date_format),
            html_body=html_body,
            branding=self._settings.branding,
        )

    def _write_output(self, version_name: str, project_key: str, html: str) -> Path:
        safe_version = sanitize_filename(version_name)
        date_str = today_str(self._settings.output.date_format)
        filename = f"{project_key}_{safe_version}_detailed_{date_str}.html"
        out_dir = ensure_dir(self._settings.paths.output_release_notes_detailed)
        return write_text(html, out_dir / filename)
