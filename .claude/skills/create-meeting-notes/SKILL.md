---
name: create-meeting-notes
description: Use when the user wants to generate meeting notes from a transcript file. Transcripts live in input/transcripts/ at the repo root. Use --all to process every transcript at once.
---

# Create Meeting Notes

Generate structured meeting notes from a plain-text transcript using Claude AI and the SE-DevTools CLI.

## Workflow

```dot
digraph meeting_notes {
  rankdir=TB;
  "Identify transcript" -> "File exists in input/transcripts/?";
  "File exists in input/transcripts/?" -> "Run CLI" [label="yes"];
  "File exists in input/transcripts/?" -> "Ask user to place file" [label="no"];
  "Ask user to place file" -> "Run CLI";
  "Run CLI" -> "Report output path";
}
```

### Step 1 — Identify the transcript

- Ask for the filename if not provided (e.g., `standup.txt`, `sprint-review.txt`)
- Files must be in `input/transcripts/` at the repo root
- Use `--all` to process every `.txt` file in that directory at once

### Step 2 — Run the CLI

Run from `packages/docs-generator/`:

```bash
cd packages/docs-generator

# Single file:
python main.py meeting-notes --file "standup.txt"

# Batch — process every .txt in input/transcripts/:
python main.py meeting-notes --all
```

Output: `../../output/meeting_notes/meeting_notes_<filename_stem>.html`

### Step 3 — Report

- Show the output file path(s)
- Note how many files were processed (for `--all`)
- Flag any transcripts that failed or produced empty output

## Notes

- Transcripts are plain text; no special formatting required
- Claude AI reads the transcript and extracts: attendees, agenda items, decisions, action items
- Output is a branded HTML document ready to share
