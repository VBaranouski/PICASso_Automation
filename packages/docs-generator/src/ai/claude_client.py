"""
Anthropic Claude AI client wrapper.
Provides high-level methods for meeting note summarization and test case generation.
Claude is instructed to respond in JSON for deterministic, structured output.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Optional

import anthropic

from src.config.settings import AIConfig


# ---------------------------------------------------------------------------
# Domain output models
# ---------------------------------------------------------------------------

@dataclass
class ActionItem:
    owner: str
    item: str
    due_date: str


@dataclass
class Attendee:
    name: str
    role: str


@dataclass
class DiscussionPoint:
    title: str
    description: str
    details: list[str]


@dataclass
class MeetingNotesSummary:
    title: str
    date: str
    time: str
    duration: str
    format: str
    attendees: list[Attendee]
    agenda_items: list[str]
    discussion_points: list[DiscussionPoint]
    key_decisions: list[str]
    action_items: list[ActionItem]
    open_items: list[str]
    next_steps: list[str]
    next_meeting: str
    summary: str
    raw_transcript_name: str


@dataclass
class TestCase:
    id: str                  # e.g. "TC-001"
    title: str
    preconditions: str
    test_steps: list[str]
    expected_result: str
    priority: str            # "High" | "Medium" | "Low"
    test_type: str           # "Positive" | "Negative" | "Edge Case"


# ---------------------------------------------------------------------------
# System prompts
# ---------------------------------------------------------------------------

_SYSTEM_MEETING = """\
You are a professional meeting facilitator and technical writer.
Your task is to analyze a meeting transcript and extract structured meeting notes.

Respond ONLY with a valid JSON object — no markdown fences, no explanatory text.

JSON schema:
{
  "title": "string — inferred meeting title",
  "date": "string — meeting date (e.g. 'February 26, 2026'), or 'Not specified'",
  "time": "string — meeting start time if mentioned, or 'Not specified'",
  "duration": "string — meeting duration if mentioned (e.g. '1 h 28 min'), or 'Not specified'",
  "format": "string — meeting format if mentioned (e.g. 'Video Call', 'In Person'), or 'Not specified'",
  "attendees": [
    {"name": "participant name", "role": "role or team affiliation inferred from transcript, or 'Participant'"}
  ],
  "agenda_items": ["list of agenda topics discussed"],
  "discussion_points": [
    {
      "title": "short descriptive heading for this discussion topic",
      "description": "1-3 sentence summary of what was discussed",
      "details": ["bullet points with specific details, sub-points, and nuances"]
    }
  ],
  "key_decisions": ["list of decisions made during the meeting — prefix each with a clear action verb"],
  "action_items": [
    {"owner": "person responsible", "item": "what they must do", "due_date": "deadline or 'TBD'"}
  ],
  "open_items": ["list of unresolved topics, parking-lot items, or risks identified but not yet addressed"],
  "next_steps": ["list of concrete next steps agreed upon"],
  "next_meeting": "string — next meeting details if mentioned, or 'Not scheduled'",
  "summary": "2-4 sentence executive summary of the meeting"
}

Guidelines:
- Extract discussion_points as detailed topic breakdowns — each should capture a distinct topic with its own title.
- For attendees, infer roles from how people are introduced or referenced in the transcript.
- open_items are for topics that were raised but not resolved, deferred, or flagged as risks.
- next_steps are concrete follow-up actions agreed upon (different from individual action_items).
- Be thorough: capture all substantive topics discussed, not just the most prominent ones.
"""

_SYSTEM_TEST_CASES = """\
You are a Senior Lead Tester with deep expertise in writing comprehensive test cases for software systems.
Given a user story with its description and acceptance criteria, generate thorough test cases
covering: happy path (positive), error/failure scenarios (negative), and boundary/edge cases.

Respond ONLY with a valid JSON array — no markdown fences, no explanatory text.

Each element must follow this schema:
{
  "id": "TC-001",
  "title": "short descriptive title",
  "preconditions": "system state or setup required before test",
  "test_steps": ["step 1", "step 2", "step 3"],
  "expected_result": "what should happen if the test passes",
  "priority": "High | Medium | Low",
  "test_type": "Positive | Negative | Edge Case"
}

Generate at least 8 test cases. Ensure thorough coverage across all test types.
"""

# Full release notes — system prompt base (template content injected at call time)
_SYSTEM_FULL_RELEASE_NOTES_BASE = """\
You are a technical writer producing official software release notes for Schneider Electric.
You will receive:
  1. A JIRA release version with its metadata and full issue list.
  2. Optionally, a supplementary spec document with feature descriptions.
  3. Strict formatting rules (the template below) that you MUST follow exactly.

Output ONLY the HTML body content — no <html>, <head>, or <body> tags.
Do NOT use markdown syntax. Start directly with the <h1> title.
Never invent feature descriptions, people names, or dates that are not present in the data.

--- TEMPLATE RULES ---
{template_content}
--- END TEMPLATE RULES ---
"""


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class ClaudeClient:
    """Wraps the Anthropic SDK with domain-specific methods."""

    def __init__(self, config: AIConfig) -> None:
        self._client = anthropic.Anthropic(api_key=config.api_key)
        self._model = config.model
        self._max_tokens = config.max_tokens

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def summarize_transcript(
        self, transcript_text: str, filename: str = "transcript"
    ) -> MeetingNotesSummary:
        """Send transcript to Claude and parse the structured meeting notes response."""
        user_message = f"Please analyze this meeting transcript:\n\n{transcript_text}"
        response_text = self._call_claude(_SYSTEM_MEETING, user_message)
        data = self._parse_json_response(response_text)

        action_items = [
            ActionItem(
                owner=ai.get("owner", "TBD"),
                item=ai.get("item", ""),
                due_date=ai.get("due_date", "TBD"),
            )
            for ai in data.get("action_items", [])
        ]

        # Parse attendees — support both old (list of strings) and new (list of dicts) formats
        raw_attendees = data.get("attendees", [])
        attendees = []
        for att in raw_attendees:
            if isinstance(att, dict):
                attendees.append(Attendee(name=att.get("name", ""), role=att.get("role", "Participant")))
            elif isinstance(att, str):
                attendees.append(Attendee(name=att, role="Participant"))

        # Parse discussion points
        discussion_points = [
            DiscussionPoint(
                title=dp.get("title", ""),
                description=dp.get("description", ""),
                details=dp.get("details", []),
            )
            for dp in data.get("discussion_points", [])
        ]

        return MeetingNotesSummary(
            title=data.get("title", "Meeting Notes"),
            date=data.get("date", "Not specified"),
            time=data.get("time", "Not specified"),
            duration=data.get("duration", "Not specified"),
            format=data.get("format", "Not specified"),
            attendees=attendees,
            agenda_items=data.get("agenda_items", []),
            discussion_points=discussion_points,
            key_decisions=data.get("key_decisions", []),
            action_items=action_items,
            open_items=data.get("open_items", []),
            next_steps=data.get("next_steps", []),
            next_meeting=data.get("next_meeting", "Not scheduled"),
            summary=data.get("summary", ""),
            raw_transcript_name=filename,
        )

    def generate_test_cases(
        self,
        story_id: str,
        story_summary: str,
        description: str,
        acceptance_criteria: str,
    ) -> list[TestCase]:
        """Send a user story to Claude and parse the structured test cases response."""
        user_message = (
            f"Story ID: {story_id}\n"
            f"Summary: {story_summary}\n\n"
            f"Description:\n{description or 'Not provided'}\n\n"
            f"Acceptance Criteria:\n{acceptance_criteria or 'Not provided'}"
        )
        response_text = self._call_claude(_SYSTEM_TEST_CASES, user_message)
        data = self._parse_json_response(response_text)

        if not isinstance(data, list):
            data = data.get("test_cases", [])

        return [
            TestCase(
                id=tc.get("id", f"TC-{i + 1:03d}"),
                title=tc.get("title", ""),
                preconditions=tc.get("preconditions", ""),
                test_steps=tc.get("test_steps", []),
                expected_result=tc.get("expected_result", ""),
                priority=tc.get("priority", "Medium"),
                test_type=tc.get("test_type", "Positive"),
            )
            for i, tc in enumerate(data)
        ]

    def generate_full_release_notes(
        self,
        version_name: str,
        project_name: str,
        release_date: str,
        issues_by_type: dict,
        template_content: str,
        spec_content: str = "",
    ) -> str:
        """
        Generate a full structured release notes HTML body using Claude AI.
        Follows the PICASso template format defined in template_content.
        Returns raw HTML body content (no <html>/<head>/<body> wrappers).
        """
        system_prompt = _SYSTEM_FULL_RELEASE_NOTES_BASE.format(
            template_content=template_content
        )

        # Build the issue list for Claude
        issue_lines: list[str] = []
        total = 0
        for itype, issues in issues_by_type.items():
            if not issues:
                continue
            issue_lines.append(f"\n{itype}s ({len(issues)}):")
            for issue in issues:
                issue_lines.append(f"  [{issue.key}] {issue.summary}")
                if issue.description:
                    desc_short = issue.description.strip().replace("\n", " ")[:300]
                    issue_lines.append(f"    Description: {desc_short}")
                if issue.assignee:
                    issue_lines.append(f"    Assignee: {issue.assignee}")
                issue_lines.append(f"    Status: {issue.status}")
            total += len(issues)

        user_message = (
            f"PROJECT: {project_name}\n"
            f"RELEASE VERSION: {version_name}\n"
            f"RELEASE DATE: {release_date or 'TBD'}\n"
            f"TOTAL ISSUES: {total}\n"
        )

        if spec_content:
            user_message += f"\n--- SUPPLEMENTARY SPEC DOCUMENT ---\n{spec_content}\n--- END SPEC ---\n"

        user_message += "\n--- JIRA ISSUES ---\n" + "\n".join(issue_lines) + "\n--- END JIRA ISSUES ---\n"
        user_message += "\nNow generate the full release notes HTML body following the template rules exactly."

        # Use extended tokens for full document generation
        response = self._client.messages.create(
            model=self._model,
            max_tokens=8192,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _call_claude(self, system_prompt: str, user_message: str) -> str:
        """Make a raw API call and return the text of the first content block."""
        response = self._client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    def _parse_json_response(self, response_text: str) -> dict | list:
        """
        Extract and parse JSON from Claude's response.
        Handles optional markdown code fences (```json ... ```).
        """
        # Strip markdown code fences if present
        cleaned = re.sub(r"^```(?:json)?\s*", "", response_text.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"```\s*$", "", cleaned.strip(), flags=re.MULTILINE)
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Claude returned invalid JSON. Response:\n{response_text[:500]}"
            ) from exc
