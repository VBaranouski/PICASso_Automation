"""
Test Cases generator.
Fetches a JIRA User Story, uses Claude AI to generate test cases, renders HTML output.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from src.ai.claude_client import ClaudeClient, TestCase
from src.clients.jira_client import JiraClient, JiraIssue
from src.config.settings import Settings
from src.utils.date_utils import today_str
from src.utils.file_utils import ensure_dir, write_text


class TestCasesGenerator:
    """Orchestrates JIRA story fetch → Claude AI → render → HTML output for Test Cases."""

    def __init__(
        self, jira: JiraClient, claude: ClaudeClient, settings: Settings
    ) -> None:
        self._jira = jira
        self._claude = claude
        self._settings = settings
        self._jinja = Environment(
            loader=FileSystemLoader(settings.paths.templates_dir),
            autoescape=False,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(self, story_id: str) -> str:
        """
        Full pipeline for a single story: fetch → Claude AI → render → write HTML.
        Returns html_filepath.
        """
        print(f"  Fetching story '{story_id}' from JIRA...")
        story = self._jira.get_story(story_id)
        print(f"  Story: {story.summary}")

        print(f"  Generating test cases via Claude AI...")
        test_cases = self._claude.generate_test_cases(
            story_id=story.key,
            story_summary=story.summary,
            description=story.description or "",
            acceptance_criteria=story.acceptance_criteria or "",
        )
        print(f"  Generated {len(test_cases)} test cases.")

        html_content = self._render_html(story, test_cases)
        html_path = self._write_output(story, html_content)

        print(f"  Written: {html_path}")
        return str(html_path)

    def generate_multiple(self, story_ids: list[str]) -> list[str]:
        """
        Process multiple story IDs sequentially.
        Returns list of html filepaths.
        """
        results: list[str] = []
        for story_id in story_ids:
            print(f"\n  Processing story: {story_id}")
            html_path = self.generate(story_id)
            results.append(html_path)
        return results

    # ------------------------------------------------------------------
    # Internal steps
    # ------------------------------------------------------------------

    def _render_html(self, story: JiraIssue, test_cases: list[TestCase]) -> str:
        template = self._jinja.get_template("test_cases.html.j2")
        return template.render(
            story=story,
            test_cases=test_cases,
            generated_date=today_str(self._settings.output.date_format),
            branding=self._settings.branding,
        )

    def _write_output(self, story: JiraIssue, html: str) -> Path:
        date_str = today_str(self._settings.output.date_format)
        base_name = self._settings.output.test_cases_filename_pattern.format(
            story_id=story.key,
            date=date_str,
        )

        out_dir = ensure_dir(self._settings.paths.output_test_cases)
        return write_text(html, out_dir / f"{base_name}.html")
