"""
Meeting Notes generator.
Reads transcript files, uses Claude AI to summarize, renders HTML + plain text output.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader

from src.ai.claude_client import ClaudeClient, MeetingNotesSummary
from src.config.settings import Settings
from src.utils.date_utils import now_str, today_str
from src.utils.file_utils import (
    ensure_dir,
    get_transcript_files,
    read_text,
    sanitize_filename,
    write_text,
)


class MeetingNotesGenerator:
    """Orchestrates transcript read → Claude AI → render → file output for Meeting Notes."""

    def __init__(self, claude: ClaudeClient, settings: Settings) -> None:
        self._claude = claude
        self._settings = settings
        self._jinja = Environment(
            loader=FileSystemLoader(settings.paths.templates_dir),
            autoescape=False,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate(self, transcript_filename: str) -> tuple[str, str]:
        """
        Process a single transcript file.
        Returns (txt_filepath, html_filepath).
        """
        transcript_dir = Path(self._settings.paths.input_transcripts)
        transcript_path = transcript_dir / transcript_filename

        if not transcript_path.exists():
            raise FileNotFoundError(
                f"Transcript not found: {transcript_path}\n"
                f"Place your .txt transcript files in '{self._settings.paths.input_transcripts}/'."
            )

        return self._process_file(transcript_path)

    def generate_all(self) -> list[tuple[str, str]]:
        """
        Process all .txt files found in the input/transcripts/ directory.
        Returns a list of (txt_filepath, html_filepath) tuples.
        """
        files = get_transcript_files(self._settings.paths.input_transcripts)
        if not files:
            print(f"  No transcript files found in '{self._settings.paths.input_transcripts}/'.")
            return []

        results: list[tuple[str, str]] = []
        for path in files:
            print(f"  Processing: {path.name}")
            pair = self._process_file(path)
            results.append(pair)

        return results

    # ------------------------------------------------------------------
    # Internal steps
    # ------------------------------------------------------------------

    def _process_file(self, path: Path) -> tuple[str, str]:
        print(f"  Reading transcript: {path.name}")
        transcript_text = read_text(path)

        print(f"  Sending to Claude AI for summarization...")
        summary = self._claude.summarize_transcript(transcript_text, filename=path.name)

        html_content = self._render_html(summary)
        txt_content = self._render_txt(summary)

        txt_path, html_path = self._write_outputs(summary, path.stem, html_content, txt_content)

        print(f"  Written: {txt_path}")
        print(f"  Written: {html_path}")
        return str(txt_path), str(html_path)

    def _render_html(self, summary: MeetingNotesSummary) -> str:
        template = self._jinja.get_template("meeting_notes.html.j2")
        return template.render(
            summary=summary,
            generated_date=now_str(),
            branding=self._settings.branding,
        )

    def _render_txt(self, summary: MeetingNotesSummary) -> str:
        lines: list[str] = []
        sep = "=" * 60

        lines += [
            sep,
            f"MEETING NOTES — {summary.title}",
            f"Date: {summary.date}",
        ]
        if summary.time != "Not specified":
            lines.append(f"Time: {summary.time}")
        if summary.duration != "Not specified":
            lines.append(f"Duration: {summary.duration}")
        if summary.format != "Not specified":
            lines.append(f"Format: {summary.format}")
        lines += [f"Transcript: {summary.raw_transcript_name}", sep, ""]

        if summary.summary:
            lines += ["EXECUTIVE SUMMARY", "-" * 40, summary.summary, ""]

        if summary.attendees:
            lines += ["ATTENDEES", "-" * 40]
            for person in summary.attendees:
                lines.append(f"  {person.name} — {person.role}")
            lines.append("")

        if summary.agenda_items:
            lines += ["AGENDA", "-" * 40]
            for i, item in enumerate(summary.agenda_items, 1):
                lines.append(f"  {i}. {item}")
            lines.append("")

        if summary.discussion_points:
            lines += ["DISCUSSION POINTS", "-" * 40]
            for dp in summary.discussion_points:
                lines.append(f"  [{dp.title}]")
                if dp.description:
                    lines.append(f"    {dp.description}")
                for detail in dp.details:
                    lines.append(f"    - {detail}")
                lines.append("")

        if summary.key_decisions:
            lines += ["DECISIONS MADE", "-" * 40]
            for decision in summary.key_decisions:
                lines.append(f"  DECIDED: {decision}")
            lines.append("")

        if summary.action_items:
            lines += ["ACTION ITEMS", "-" * 40]
            for i, ai in enumerate(summary.action_items, 1):
                lines.append(f"  {i}. {ai.item}")
                lines.append(f"     Owner: {ai.owner}  |  Due: {ai.due_date}")
            lines.append("")

        if summary.open_items:
            lines += ["OPEN ITEMS / PARKING LOT", "-" * 40]
            for item in summary.open_items:
                lines.append(f"  ! {item}")
            lines.append("")

        if summary.next_steps:
            lines += ["NEXT STEPS", "-" * 40]
            for step in summary.next_steps:
                lines.append(f"  > {step}")
            lines.append("")

        if summary.next_meeting and summary.next_meeting != "Not scheduled":
            lines += ["NEXT MEETING", "-" * 40, f"  {summary.next_meeting}", ""]

        lines += [sep, f"Generated by SE-DevTools — {self._settings.branding.company_name}"]
        return "\n".join(lines)

    def _write_outputs(
        self,
        summary: MeetingNotesSummary,
        transcript_stem: str,
        html: str,
        txt: str,
    ) -> tuple[Path, Path]:
        safe_stem = sanitize_filename(transcript_stem)
        date_str = today_str(self._settings.output.date_format)
        base_name = self._settings.output.meeting_notes_filename_pattern.format(
            transcript_stem=safe_stem,
            date=date_str,
        )

        out_dir = ensure_dir(self._settings.paths.output_meeting_notes)

        txt_path = write_text(txt, out_dir / f"{base_name}.txt")
        html_path = write_text(html, out_dir / f"{base_name}.html")

        return txt_path, html_path
