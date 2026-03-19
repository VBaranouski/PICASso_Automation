"""
Full Release Notes generator (AI-powered, PICASso format).

Pipeline:
  1. Load template rules from output/full_release_notes/template/release_notes_template.md
  2. Fetch JIRA version metadata + all issues
  3. Optionally read a spec file from input/full_release_notes/
  4. Send everything to Claude AI, which generates structured HTML body content
  5. Wrap the AI-generated body in the SE-branded HTML shell template
  6. Write output to output/full_release_notes/

Differs from release_notes.py (simple table dump):
  - AI synthesizes narrative sections: Revision History, Introduction, Objectives,
    New Features & Enhancements (numbered subsections), Defect Fixes
  - Requires ANTHROPIC_API_KEY
  - HTML only output (no .txt)
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from src.ai.claude_client import ClaudeClient
from src.clients.confluence_client import ConfluenceClient
from src.clients.jira_client import JiraClient
from src.config.settings import Settings
from src.utils.date_utils import format_jira_date, today_str
from src.utils.file_utils import ensure_dir, read_text, sanitize_filename, write_text

# Path to the mandatory template file (relative to project root)
_TEMPLATE_FILE = Path("output/full_release_notes/template/release_notes_template.md")


class FullReleaseNotesGenerator:
    """AI-powered full release notes generator following the PICASso document format."""

    def __init__(
        self,
        jira: JiraClient,
        claude: ClaudeClient,
        settings: Settings,
        confluence: Optional[ConfluenceClient] = None,
    ) -> None:
        self._jira = jira
        self._claude = claude
        self._settings = settings
        self._confluence = confluence
        self._jinja = Environment(
            loader=FileSystemLoader(settings.paths.templates_dir),
            autoescape=False,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(
        self,
        version_name: str,
        project_key: Optional[str] = None,
        spec_filename: Optional[str] = None,
        publish_to_confluence: bool = False,
    ) -> str:
        """
        Full pipeline: fetch JIRA -> (load spec) -> Claude AI -> render -> write HTML.
        Returns html_filepath.
        """
        key = project_key or self._settings.jira.project_key

        # 1. Load template rules
        template_content = self._load_template()

        # 2. Fetch JIRA data
        print(f"  Fetching version '{version_name}' from JIRA project '{key}'...")
        version = self._jira.get_version_by_name(version_name, key)
        version.release_date = format_jira_date(version.release_date)

        print(f"  Fetching all issues for version '{version_name}'...")
        issues_by_type = self._jira.get_issues_by_version(version_name, key)
        total = sum(len(v) for v in issues_by_type.values())
        print(f"  Found {total} issues across {len(issues_by_type)} type(s).")

        # 3. Load optional spec file
        spec_content = ""
        if spec_filename:
            spec_path = Path(self._settings.paths.input_full_release_notes) / spec_filename
            if not spec_path.exists():
                raise FileNotFoundError(
                    f"Spec file not found: {spec_path}\n"
                    f"Place it in '{self._settings.paths.input_full_release_notes}/'."
                )
            spec_content = read_text(spec_path)
            print(f"  Loaded spec file: {spec_filename}")
        else:
            # Auto-detect: use first .txt or .md file in input folder
            input_dir = Path(self._settings.paths.input_full_release_notes)
            candidates = [f for f in input_dir.iterdir()
                          if f.is_file() and f.suffix.lower() in (".txt", ".md")
                          and not f.name.startswith(".")]
            if candidates:
                spec_content = read_text(candidates[0])
                print(f"  Auto-loaded spec file: {candidates[0].name}")

        # 4. Generate HTML body via Claude
        print(f"  Generating full release notes via Claude AI...")
        html_body = self._claude.generate_full_release_notes(
            version_name=version_name,
            project_name=version.project_key,
            release_date=version.release_date or "TBD",
            issues_by_type=issues_by_type,
            template_content=template_content,
            spec_content=spec_content,
        )
        print(f"  Claude AI generation complete.")

        # 5. Wrap in SE-branded HTML shell
        html_full = self._render_shell(
            version_name=version_name,
            project_key=key,
            release_date=version.release_date or "TBD",
            total_issues=total,
            html_body=html_body,
        )

        # 6. Write output
        html_path = self._write_output(version_name, key, html_full)
        print(f"  Written: {html_path}")

        # 7. Optional Confluence publish
        if publish_to_confluence and self._confluence:
            page_title = f"Full Release Notes - {key} {version_name}"
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
                "Expected: output/full_release_notes/template/release_notes_template.md"
            )
        return read_text(_TEMPLATE_FILE)

    def _render_shell(
        self,
        version_name: str,
        project_key: str,
        release_date: str,
        total_issues: int,
        html_body: str,
    ) -> str:
        template = self._jinja.get_template("full_release_notes.html.j2")
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
        filename = f"{project_key}_{safe_version}_full_{date_str}.html"
        out_dir = ensure_dir(self._settings.paths.output_full_release_notes)
        return write_text(html, out_dir / filename)
