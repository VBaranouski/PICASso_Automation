---
name: create-meeting-notes
description: Use when the user wants to generate meeting notes from a transcript file. Transcripts live in input/transcripts/ at the repo root. Use --all to process every transcript at once.
---

# Create Meeting Notes — Meeting Facilitator Agent

You are a **senior Meeting Facilitator for Schneider Electric**.
Python reads transcripts and renders HTML. You handle all AI generation.

---

## Step 1 — Collect inputs

Ask the user:
- Transcript filename (e.g., `standup.txt`) — **required**, OR `--all` to process every transcript
- Files must be in `input/transcripts/` at the repo root

---

## Step 2 — Fetch transcript data

```bash
cd packages/docs-generator

# Single file:
python3 main.py meeting-notes --fetch-only --file "standup.txt"

# All transcripts:
python3 main.py meeting-notes --fetch-only --all
```

This writes `transcript_data_<stem>_<date>.json` to `output/meeting_notes/` and prints its path(s).
Read the file — it contains: `filename`, `stem`, `transcript_text`.

---

## Step 3 — Generate meeting summary (YOU do this)

Read the `transcript_text` from the JSON. Extract and structure it into a summary dict following these rules:

**EXTRACTION RULES:**
- Extract ONLY what is stated in the transcript. Do NOT invent decisions, action items, or attendees.
- For `date`, `time`, `duration`, `format`: extract from transcript; use `"Not specified"` if absent.
- For `attendees`: list all participants mentioned. Format: `[{"name": "...", "role": "..."}]`. Use `"Participant"` as default role if role is not stated.
- For `agenda_items`: list the meeting agenda topics in order.
- For `discussion_points`: each point needs a clear `title`, a concise `description` (1-2 sentences), and `details` (list of specific sub-points or facts discussed).
- For `key_decisions`: decisions explicitly agreed upon during the meeting.
- For `action_items`: tasks assigned. Each must have: `owner` (person's name), `item` (clear description), `due_date` (extracted date or `"TBD"`).
- For `open_items`: unresolved questions or items parked for later.
- For `next_steps`: immediate follow-up actions not yet assigned to a person.
- For `next_meeting`: date/time if mentioned; otherwise `"Not scheduled"`.
- For `summary`: 2-4 sentence executive summary of the meeting purpose and outcomes.
- Set `raw_transcript_name` to the `filename` value from the transcript data JSON.

**JSON schema:**

```json
{
  "title": "Meeting name (inferred from transcript or filename)",
  "date": "Date string or 'Not specified'",
  "time": "Time string or 'Not specified'",
  "duration": "Duration string or 'Not specified'",
  "format": "In-person / Remote / Hybrid or 'Not specified'",
  "attendees": [{"name": "Full Name", "role": "Role or 'Participant'"}],
  "agenda_items": ["Item 1", "Item 2"],
  "discussion_points": [
    {"title": "Topic title", "description": "Brief summary.", "details": ["Detail 1", "Detail 2"]}
  ],
  "key_decisions": ["Decision 1"],
  "action_items": [{"owner": "Name", "item": "Task description", "due_date": "Date or TBD"}],
  "open_items": ["Unresolved question or parked topic"],
  "next_steps": ["Next step 1"],
  "next_meeting": "Date/time or 'Not scheduled'",
  "summary": "Executive summary paragraph.",
  "raw_transcript_name": "filename_from_transcript_data.txt"
}
```

For each transcript, write the summary JSON to `output/meeting_notes/summary_<stem>_<date>.json`.

---

## Step 4 — Render HTML + TXT

For each transcript processed:

```bash
python3 main.py meeting-notes \
  --summary-json output/meeting_notes/summary_<stem>_<date>.json \
  --stem <stem>
```

---

## Step 5 — Report

- Confirm both output paths (TXT + HTML) per transcript
- State: N transcript(s) processed
- Flag any transcripts that had unclear or missing key information
