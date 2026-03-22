"""
User Stories generator.
Fetches data from Confluence, JIRA, and Figma — pure data layer, no AI.
AI generation is handled by the calling skill (Claude Code as Business Analyst).
"""

from __future__ import annotations

import base64
import json
import re
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from src.clients.confluence_client import ConfluenceClient
from src.clients.figma_client import FigmaClient
from src.clients.jira_client import JiraClient, JiraIssue
from src.config.settings import Settings
from src.utils.date_utils import today_str
from src.utils.file_utils import ensure_dir, sanitize_filename, write_text


# ---------------------------------------------------------------------------
# Domain model
# ---------------------------------------------------------------------------

@dataclass
class UserStory:
    title: str
    as_a: str
    i_want: str
    so_that: str
    acceptance_criteria: list[str]
    source_requirement: str


# ---------------------------------------------------------------------------
# HTML → plain text helper
# ---------------------------------------------------------------------------

class _HTMLStripper(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        stripped = data.strip()
        if stripped:
            self._parts.append(stripped)

    def get_text(self) -> str:
        return "\n".join(self._parts)


def _html_to_text(html_str: str) -> str:
    stripper = _HTMLStripper()
    stripper.feed(html_str)
    return stripper.get_text()


def _extract_confluence_page_id(url: str) -> str:
    match = re.search(r"/pages/(\d+)", url)
    if not match:
        raise ValueError(
            f"Cannot extract Confluence page ID from URL: {url}\n"
            "Expected format: .../pages/123456/..."
        )
    return match.group(1)


def _format_story_for_prompt(story: JiraIssue) -> str:
    lines = [f"  Key: {story.key}", f"  Title: {story.summary}"]
    if story.description:
        lines.append(f"  Description: {story.description[:500]}")
    if story.acceptance_criteria:
        lines.append(f"  Acceptance Criteria: {story.acceptance_criteria[:500]}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------

class UserStoriesGenerator:
    """
    Two-phase pipeline:
      Phase 1 — fetch_data(): Confluence + JIRA + Figma → spec_data dict (JSON-serialisable)
      Phase 2 — render_from_stories(): stories JSON + spec_data → HTML file
    """

    def __init__(
        self,
        confluence: ConfluenceClient,
        figma: Optional[FigmaClient],
        jira: Optional[JiraClient],
        settings: Settings,
    ) -> None:
        self._confluence = confluence
        self._figma = figma
        self._jira = jira
        self._settings = settings
        self._jinja = Environment(
            loader=FileSystemLoader(settings.paths.templates_dir),
            autoescape=False,
        )

    # ------------------------------------------------------------------
    # Phase 1: Data fetching
    # ------------------------------------------------------------------

    def fetch_data(
        self,
        confluence_url: str,
        figma_url: Optional[str] = None,
        example_story_ids: Optional[list[str]] = None,
        epic_key: Optional[str] = None,
    ) -> dict:
        """
        Fetch all data needed to generate and render user stories.
        Returns a JSON-serialisable dict — write it to spec_data.json and pass to the skill.
        """
        out_dir = ensure_dir(self._settings.paths.output_user_stories)

        # --- Confluence spec ---
        print("  Fetching Confluence specification...")
        page_id = _extract_confluence_page_id(confluence_url)
        page_data = self._confluence.get_page(page_id)
        page_title = page_data.get("title", "Specification")
        body_html = page_data.get("body", {}).get("storage", {}).get("value", "")
        spec_text = _html_to_text(body_html)
        print(f"  Page: {page_title} ({len(spec_text)} chars)")

        # --- Confluence attachments ---
        confluence_screenshots: list[list[str]] = []  # [[title, data_url], ...]
        image_names: list[str] = []
        _IMAGE_MIMES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
        try:
            attachments = self._confluence.get_attachments(page_id)
            image_attachments = [
                a for a in attachments
                if a.get("metadata", {}).get("mediaType", "") in _IMAGE_MIMES
            ]
            if image_attachments:
                print(f"  Found {len(image_attachments)} image attachment(s).")
            for att in image_attachments:
                download_url = att.get("_links", {}).get("download", "")
                title = att.get("title", "attachment")
                media_type = att.get("metadata", {}).get("mediaType", "image/png")
                if not download_url:
                    continue
                try:
                    img_bytes = self._confluence.download_attachment(download_url)
                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    mime = "image/png" if "png" in media_type else "image/jpeg"
                    confluence_screenshots.append([title, f"data:{mime};base64,{b64}"])
                    image_names.append(title)
                    print(f"  Downloaded attachment: {title}")
                except Exception as exc:
                    print(f"  [WARNING] Could not download attachment '{title}': {exc}")
        except Exception as exc:
            print(f"  [WARNING] Could not fetch attachments: {exc}")

        # --- Figma screenshot ---
        figma_screenshot_data_url: Optional[str] = None
        figma_context = ""
        if figma_url and self._figma:
            print("  Fetching Figma screenshot...")
            try:
                saved_paths = self._figma.screenshot_from_url(figma_url, out_dir)
                if saved_paths:
                    img_bytes = saved_paths[0].read_bytes()
                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    figma_screenshot_data_url = f"data:image/png;base64,{b64}"
                    print(f"  Screenshot saved: {saved_paths[0].name}")
            except Exception as exc:
                print(f"  [WARNING] Could not fetch Figma screenshot: {exc}")
            try:
                parsed = FigmaClient.parse_figma_url(figma_url)
                figma_context = (
                    f"Figma design file: {parsed.file_key}"
                    + (f", node: {parsed.node_id}" if parsed.node_id else "")
                    + "\nThis is the UI design mockup for the features described above."
                )
            except Exception:
                figma_context = f"Figma design reference: {figma_url}"

        # --- JIRA example stories ---
        example_stories_text = ""
        if example_story_ids and self._jira:
            print(f"  Fetching {len(example_story_ids)} example story(s)...")
            examples: list[str] = []
            for sid in example_story_ids:
                try:
                    story = self._jira.get_story(sid)
                    examples.append(_format_story_for_prompt(story))
                    print(f"  Example: {sid} — {story.summary}")
                except Exception as exc:
                    print(f"  [WARNING] Could not fetch example story {sid}: {exc}")
            if examples:
                example_stories_text = "\n\n".join(examples)

        # --- JIRA epic context ---
        epic_context = ""
        if epic_key and self._jira:
            print(f"  Fetching Epic context: {epic_key}...")
            try:
                epic = self._jira.get_story(epic_key)
                epic_context = f"{epic.key}: {epic.summary}"
                if epic.description:
                    epic_context += f"\n{epic.description[:800]}"
                print(f"  Epic: {epic.summary}")
            except Exception as exc:
                print(f"  [WARNING] Could not fetch Epic {epic_key}: {exc}")

        return {
            "page_title": page_title,
            "confluence_url": confluence_url,
            "spec_text": spec_text,
            "epic_key": epic_key,
            "epic_context": epic_context,
            "example_stories_text": example_stories_text,
            "figma_url": figma_url,
            "figma_context": figma_context,
            "figma_screenshot_data_url": figma_screenshot_data_url,
            "image_names": image_names,
            "confluence_screenshots": confluence_screenshots,
        }

    # ------------------------------------------------------------------
    # Phase 2: Render HTML from stories
    # ------------------------------------------------------------------

    def render_from_stories(self, spec_data: dict, stories_input, style: str = "default") -> str:
        """
        Render HTML from spec_data (from fetch_data) and stories (generated by the skill).

        stories_input can be:
          - list[dict]  — legacy format (array of story objects)
          - dict        — new format: {"stories": [...], "questions": [...]}

        Each story's acceptance_criteria may contain plain strings or dicts of the form
        {"text": "...", "screenshot": "filename.png"}.  Stories may also carry a top-level
        "screenshots" key (list[str]) for a story-level image gallery.

        Returns the path to the written HTML file.
        """
        # ------------------------------------------------------------------
        # Parse input — handle both legacy list and new dict wrapper
        # ------------------------------------------------------------------
        if isinstance(stories_input, list):
            raw_stories = stories_input
            questions: list = []
        else:
            raw_stories = stories_input.get("stories", [])
            questions = stories_input.get("questions", [])

        # ------------------------------------------------------------------
        # Build screenshot lookup: {filename: data_url}
        # ------------------------------------------------------------------
        screenshot_lookup: dict[str, str] = {
            title: data_url
            for title, data_url in spec_data.get("confluence_screenshots", [])
        }

        print(f"  Rendering {len(raw_stories)} user story(s)...")

        template_name = "user_stories_hacker.html.j2" if style == "hacker" else "user_stories.html.j2"
        template = self._jinja.get_template(template_name)
        html_content = template.render(
            page_title=spec_data.get("page_title", "User Stories"),
            confluence_url=spec_data.get("confluence_url", ""),
            figma_url=spec_data.get("figma_url"),
            figma_screenshot_data_url=spec_data.get("figma_screenshot_data_url"),
            confluence_screenshots=spec_data.get("confluence_screenshots", []),
            epic_key=spec_data.get("epic_key"),
            epic_context=spec_data.get("epic_context", ""),
            stories=raw_stories,
            questions=questions,
            screenshot_lookup=screenshot_lookup,
            generated_date=today_str(self._settings.output.date_format),
            branding=self._settings.branding,
        )

        html_path = self._write_output(spec_data.get("page_title", "user_stories"), html_content)
        print(f"  Written: {html_path}")
        return str(html_path)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _write_output(self, page_title: str, html: str) -> Path:
        date_str = today_str(self._settings.output.date_format)
        safe_title = sanitize_filename(page_title)[:40]
        base_name = self._settings.output.user_stories_filename_pattern.format(
            title=safe_title,
            date=date_str,
        )
        out_dir = ensure_dir(self._settings.paths.output_user_stories)
        return write_text(html, out_dir / f"{base_name}.html")
