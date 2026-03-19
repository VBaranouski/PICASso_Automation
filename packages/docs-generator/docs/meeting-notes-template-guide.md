# Meeting Notes Template Guide

Reference template: `output/meeting_notes/template/PICASso-DigitalEnergy-Questions-20260226.html`

## How it works

```
input/transcripts/*.txt  →  Claude AI  →  meeting_notes.html.j2  →  output/meeting_notes/*.html
```

1. **Input** — Place `.txt` transcript files in `input/transcripts/`.
2. **AI extraction** — Claude parses the transcript into a structured JSON object.
3. **Rendering** — Jinja2 template produces the HTML output with SE branding.
4. **Output** — HTML + TXT files written to `output/meeting_notes/`.

## Running

```bash
python main.py meeting-notes --file "transcript.txt"   # single file
python main.py meeting-notes --all                      # all transcripts
```

## JSON structure returned by Claude

The AI is instructed to extract this schema from every transcript:

```json
{
  "title": "Inferred meeting title",
  "date": "February 26, 2026",
  "time": "3:33 PM",
  "duration": "1 h 28 min",
  "format": "Video Call",
  "attendees": [
    {"name": "Jane Doe", "role": "Product Owner"}
  ],
  "agenda_items": ["Topic 1", "Topic 2"],
  "discussion_points": [
    {
      "title": "Short heading",
      "description": "1-3 sentence summary",
      "details": ["bullet 1", "bullet 2"]
    }
  ],
  "key_decisions": ["Decision text"],
  "action_items": [
    {"owner": "Jane Doe", "item": "Do the thing", "due_date": "ASAP"}
  ],
  "open_items": ["Unresolved topic or risk"],
  "next_steps": ["Concrete follow-up"],
  "next_meeting": "Not scheduled",
  "summary": "2-4 sentence executive summary"
}
```

## HTML template sections

The template (`src/templates/meeting_notes.html.j2`) renders these sections in order:

| Section | Source field | Visual style |
|---------|-------------|--------------|
| Header banner | `title`, `date`, `time`, `duration`, `format` | Dark green banner with white text |
| Executive Summary | `summary` | Green left-border box |
| Attendees | `attendees[].name`, `attendees[].role` | Two-column table |
| Agenda | `agenda_items[]` | Bulleted list |
| Discussion Points | `discussion_points[]` | Card per topic: title + description + bullet details |
| Decisions Made | `key_decisions[]` | Badge ("DECIDED") + text |
| Action Items | `action_items[]` | Table: # / Action / Owner / Due |
| Open Items | `open_items[]` | Yellow left-border cards (risk/parking lot) |
| Next Steps | `next_steps[]` | Green bordered box with bullets |
| Next Meeting | `next_meeting` | Green bordered box |
| Footer | `date`, `branding.company_name` | Centered gray text |

All sections are conditionally rendered — if Claude returns an empty list, the section is omitted.

## Color scheme and branding

Colors are driven by CSS variables injected from `config.yaml → branding`:

| Variable | Config key | Default | Used for |
|----------|-----------|---------|----------|
| `--mn-primary` | `primary_color` | `#3DCD58` | Accent borders, header label |
| `--mn-dark` | `dark_color` | `#009530` | Header bg, table headers, section headings |
| `--mn-text` | `text_color` | `#333333` | Body text |
| `--mn-border` | `border_color` | `#C8E6C9` | Table borders, header meta text |
| `--mn-row-alt` | `row_alt_color` | `#F0FBF2` | Alternating table rows, summary/topic bg |
| `--mn-hover` | `hover_color` | `#E8F5E9` | (reserved) |
| `--mn-font` | `font_family` | `'Nunito Sans', Arial, sans-serif` | All text |

To change colors, edit `config.yaml` under `branding:`. No template edits needed.

Open items/parking lot always use yellow (`#f0b840` border, `#fefdf4` bg) regardless of branding — this is intentional to visually separate risks from normal content.

## Dataclasses

Defined in `src/ai/claude_client.py`:

```python
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
class ActionItem:
    owner: str
    item: str
    due_date: str

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
```

## Customization guide

### Change colors
Edit `config.yaml` → `branding` section. All templates share the same branding.

### Add a new section
1. Add the field to `MeetingNotesSummary` dataclass.
2. Add the key to the JSON schema in `_SYSTEM_MEETING` prompt.
3. Parse it in `summarize_transcript()`.
4. Add the HTML block in `meeting_notes.html.j2` (use existing sections as patterns).
5. Add the text block in `_render_txt()` in `meeting_notes.py`.

### Change section order
Reorder the HTML blocks in `meeting_notes.html.j2`. The template is purely declarative — section order is determined by the template, not the data.

### Use a different AI model
Edit `config.yaml` → `ai.model`. Works with any Claude model ID.

## Reference file

The file `output/meeting_notes/template/PICASso-DigitalEnergy-Questions-20260226.html` is the gold-standard reference for meeting notes output. The Jinja2 template replicates its:

- Document structure (header → body → sections → footer)
- Visual hierarchy (green banner, topic cards, decision badges, action table)
- Color palette (dark green headers, light green backgrounds, yellow risk items)
- Typography (13px base, uppercase section headings, 700-weight headings)
- Spacing and border patterns (3px left borders, 4px radius, 40px body padding)
