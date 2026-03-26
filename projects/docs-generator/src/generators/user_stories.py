"""
User Stories generator.
Fetches data from Confluence, JIRA, and Figma — pure data layer, no AI.
AI generation is handled by the calling skill (Claude Code as Business Analyst).
"""

from __future__ import annotations

import base64
import json
import re
from collections import defaultdict
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional

import requests
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
# Jinja2 filter: criterion text → HTML
# ---------------------------------------------------------------------------

def _format_criterion_html(text: str) -> str:
    """Convert criterion text with bullet lists and Figma inline links to HTML.

    Transformations applied:
    - ``\\n  - item`` or ``\\n- item`` blocks → ``<ul class="ac-sublist"><li>…</li></ul>``
    - ``(see Figma [Label|url])`` → clickable ``<a>`` link
    """
    # Convert (see Figma [Label|url]) to a clickable link
    text = re.sub(
        r"\(see Figma \[([^\]|]+)\|([^\]]+)\]\)",
        r'(see Figma <a href="\2" target="_blank" class="figma-link">\1</a>)',
        text,
    )
    # Convert \n  - or \n- list blocks to <ul><li>
    if "\n  - " in text or "\n- " in text:
        sep = "\n  - " if "\n  - " in text else "\n- "
        parts = text.split(sep)
        header = parts[0]
        items = [p.rstrip() for p in parts[1:] if p.strip()]
        li_html = "".join(f"<li>{item}</li>" for item in items)
        return f"{header}<ul class='ac-sublist'>{li_html}</ul>"
    return text


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
        self._jinja.filters["format_criterion"] = _format_criterion_html

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
        # Build screenshot lookup: {key: data_url}
        # Seeded from confluence_screenshots (legacy), then extended with
        # Figma mockup screenshots auto-fetched from additional_information.
        # ------------------------------------------------------------------
        screenshot_lookup: dict[str, str] = {
            title: data_url
            for title, data_url in spec_data.get("confluence_screenshots", [])
        }

        if self._figma:
            figma_shots = self._fetch_figma_mockup_screenshots(raw_stories)
            screenshot_lookup.update(figma_shots)
            if figma_shots:
                print(f"  Fetched {len(figma_shots)} Figma mockup screenshot(s).")

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

    def _fetch_figma_mockup_screenshots(self, stories: list[dict]) -> dict[str, str]:
        """
        Scan every story's additional_information.mockups for Figma URLs,
        batch-export screenshots via the Figma REST API (one request per
        unique file key), and return {node_id_hyphen: data_url}.

        The key format is the node-id with hyphens (e.g. "7193-205128"),
        matching the node-id query param in Figma URLs.  Stories should
        use this same format in their `screenshot` fields.

        Screenshots are cached to disk under output/user_stories/.figma_cache/
        to avoid redundant API calls across repeated renders.
        """
        cache_dir = ensure_dir(
            Path(self._settings.paths.output_user_stories) / ".figma_cache"
        )

        # Collect only node IDs that are actually referenced in screenshot fields
        # (story-level screenshots list + criterion-level screenshot dicts).
        # node_id_colon — Figma API format ("7193:205128")
        # node_id_hyphen — URL/story key format ("7193-205128")
        needed_keys: set[str] = set()
        for story in stories:
            for key in story.get("screenshots", []):
                needed_keys.add(key)
            for ac in story.get("acceptance_criteria", []):
                if isinstance(ac, dict) and ac.get("screenshot"):
                    needed_keys.add(ac["screenshot"])

        # Build a url-lookup from mockups so we can resolve node → file_key
        url_by_node_hyphen: dict[str, str] = {}
        for story in stories:
            for mockup in story.get("additional_information", {}).get("mockups", []):
                url = mockup.get("url", "")
                if not url or "figma.com" not in url:
                    continue
                try:
                    parsed = FigmaClient.parse_figma_url(url)
                    if parsed.node_id:
                        node_hyphen = parsed.node_id.replace(":", "-")
                        url_by_node_hyphen[node_hyphen] = url
                except Exception:
                    continue

        # Only fetch nodes that are both needed and have a known Figma URL
        file_nodes: dict[str, dict[str, str]] = defaultdict(dict)
        for node_id_hyphen in needed_keys:
            url = url_by_node_hyphen.get(node_id_hyphen)
            if not url:
                continue
            try:
                parsed = FigmaClient.parse_figma_url(url)
                if parsed.node_id:
                    file_nodes[parsed.file_key][parsed.node_id] = node_id_hyphen
            except Exception:
                continue

        if not file_nodes:
            return {}

        result: dict[str, str] = {}

        for file_key, node_map in file_nodes.items():
            # Split into cached vs uncached nodes.
            to_fetch: dict[str, str] = {}
            for node_id_colon, node_id_hyphen in node_map.items():
                cache_file = cache_dir / f"{file_key}_{node_id_hyphen}.png"
                if cache_file.exists():
                    b64 = base64.b64encode(cache_file.read_bytes()).decode("utf-8")
                    result[node_id_hyphen] = f"data:image/png;base64,{b64}"
                else:
                    to_fetch[node_id_colon] = node_id_hyphen

            if not to_fetch:
                continue

            # Fetch export URLs for uncached nodes in one API call.
            try:
                image_urls = self._figma.get_image_urls(
                    file_key, list(to_fetch.keys()), scale=1.5
                )
            except requests.HTTPError as exc:
                retry_after = exc.response.headers.get("Retry-After", "") if exc.response is not None else ""
                hint = f" (Retry-After: {retry_after}s)" if retry_after else ""
                print(f"  [WARNING] Figma export failed for {file_key}: {exc}{hint}")
                print(f"  [WARNING] Screenshots skipped — re-run render once rate limit clears to populate cache.")
                continue
            except Exception as exc:
                print(f"  [WARNING] Figma export failed for {file_key}: {exc}")
                continue

            for node_id_colon, img_url in image_urls.items():
                if not img_url:
                    continue
                node_id_hyphen = to_fetch.get(node_id_colon, node_id_colon.replace(":", "-"))
                try:
                    resp = requests.get(img_url, timeout=60, verify=False)
                    resp.raise_for_status()
                    img_bytes = resp.content
                    # Write to cache.
                    cache_file = cache_dir / f"{file_key}_{node_id_hyphen}.png"
                    cache_file.write_bytes(img_bytes)
                    b64 = base64.b64encode(img_bytes).decode("utf-8")
                    result[node_id_hyphen] = f"data:image/png;base64,{b64}"
                except Exception as exc:
                    print(f"  [WARNING] Could not download Figma image {node_id_colon}: {exc}")

        return result

    def _write_output(self, page_title: str, html: str) -> Path:
        date_str = today_str(self._settings.output.date_format)
        safe_title = sanitize_filename(page_title)[:40]
        base_name = self._settings.output.user_stories_filename_pattern.format(
            title=safe_title,
            date=date_str,
        )
        out_dir = ensure_dir(self._settings.paths.output_user_stories)
        return write_text(html, out_dir / f"{base_name}.html")
