---
name: push-stories-to-jira
description: Use when pushing generated user stories from stories_*.json files to Jira as Story issues. Creates issues directly via MCP tools (NOT atlas agent), links to epic, reports screenshots to attach manually.
---

# Push Stories to Jira

Pushes user stories from the `create-user-stories` JSON output into Jira as Story issues.
**Call `jira_create_issue` and `jira_update_issue` directly — do NOT route through the atlas agent.**
The atlas agent's markdown parser strips or transforms markup before it reaches Jira.

---

## Step 1 — Locate input files

Find in `output/user_stories/`:

- `stories_<topic>_<date>.json` — the stories to create
- `spec_data_<topic>_<date>.json` — for epic/parent context

If multiple pairs exist, use the most recently modified. User may also pass explicit paths.

---

## Step 2 — Determine parent epic

Read `spec_data.epic_context` (e.g. `"PIC-9841"`).

- If present → use as epic key. No prompt needed.
- If missing → ask: "Which Epic or Feature key should these stories be linked to?"

---

## Step 3 — Pilot: create story #1

Create only the **first story** via `jira_create_issue` (single call, not batch).

Show the user:
- The created issue key + URL (`https://jira.se.com/browse/<KEY>`)
- Ask: "Does this look correct? Proceed with the remaining N stories?"

Only continue to Step 4 if user confirms.

---

## Step 4 — Create remaining stories

Call `jira_batch_create_issues` directly for stories 2–N.

Each issue payload:

```json
{
  "project": { "key": "PIC" },
  "summary": "<story.title>",
  "issuetype": { "name": "Story" },
  "description": "<markdown — see template below>",
  "reporter": { "name": "SESA780678" },
  "customfield_10000": "<epic_key>"
}
```

---

## Step 5 — Verify epic links

After batch creation, confirm that all created issues show the correct epic in `customfield_10000`. If any issue is missing the epic link, call `jira_link_to_epic` for that issue as a fallback.

---

## Step 6 — Report screenshots for manual upload

For each story with a non-empty `screenshots` array, look for matching files in:
`output/user_stories/.figma_cache/` — naming: `{figmaFileKey}_{nodeId}.png`

Match node IDs from `story.screenshots` to cache files. Report a table:

| Issue Key | Story Title | Files to attach |
|-----------|------------|-----------------|
| PIC-XXXX | ... | `VCnhN..._{nodeId}.png` |

> Note: Jira MCP has no attachment upload tool. Files must be attached manually via browser.

---

## Step 7 — Final summary

Print a table of all created issues:

| # | Issue Key | Title | Epic Linked |
|---|-----------|-------|-------------|
| 1 | PIC-XXXX | ... | PIC-9841 ✓ |

---

## Description Markdown Template

The `jira_create_issue` / `jira_update_issue` MCP tools convert markdown to Jira wiki markup before
sending to the API. Build the description in **markdown** using the rules below.

```
**_As a_** {story.as_a},
**_I want_** {story.i_want},
**_So that_** {story.so_that}.



**_Acceptance Criteria_**:

**AC1.** {ac text}

**AC2.** {ac text}

...



**_Additional Information_**:
 * Functional Specification: [{label}]({url})
 * Mockups:
[{label}]({url})
[{label}]({url})
```

> The ` ` line (a single space on its own line) before section headers creates extra vertical space in Jira.

---

## Markdown → Jira Wiki Conversion Rules

The MCP tool performs this conversion automatically:

| Markdown input | Stored Jira wiki | Renders as |
|---|---|---|
| `**text**` | `*text*` | **bold** |
| `_text_` | `_text_` | _italic_ |
| `**_text_**` | `*_text_*` | ***bold italic*** |
| `*text*` | `_text_` | _italic_ (NOT bold — avoid single asterisk!) |
| `[label](url)` | `[label\|url]` | hyperlink |
| `* item` | `* item` | bullet |

**CRITICAL:** Use `**AC1.**` (double asterisk) for bold AC labels — NOT `*AC1.*` (single asterisk), which becomes italic.

---

## AC Item Rules

- Number each AC sequentially: `**AC1.**`, `**AC2.**`, `**AC3.**`, etc.
- Add a blank line between each AC item
- String item → use text directly after the label: `**ACN.** {text}`
- Object `{"text": "...", "screenshot": "..."}` → use only the `text` value (screenshot reference is already embedded as a Figma link inside the text)
- For AC text that contains `\n- sub-item` patterns → convert to markdown bullets: `\n * sub-item`
- For AC text that contains `**bold**` markdown → keep as-is, it will render as bold
- Separator strings like `"**Product Requirements:**"` → render as `**Product Requirements:**` (bold line, not an AC label)
- Diagrams section: only add if `story.additional_information.diagrams` is non-empty

### "see Figma" links — orange and bold

Wrap every "see Figma" occurrence using Jira color macro with markdown bold:

```
{color:orange}**see Figma**{color}
```

The `{color:}` tags are Jira-specific macros not recognized by the markdown parser, so they pass through as-is. The `**...**` inside is converted to `*...*` (Jira bold). Result: bold orange "see Figma" in Jira.

Full example in an AC:

```
**AC1.** The pop-up shows... ({color:orange}**see Figma**{color} [Frame Name](https://www.figma.com/...))
```

---

## Escape Rules

- Pipe characters inside link labels must be avoided: rewrite label to remove pipes
- Do not escape the separator pipe between label and URL — handled automatically by MCP tool conversion

---

## Field Mapping Reference

| JSON field | Jira field |
|---|---|
| `story.title` | `summary` |
| `story.as_a` + `i_want` + `so_that` | `description` (header) |
| `story.acceptance_criteria[]` | `description` (AC section) |
| `story.additional_information.mockups` | `description` (Additional Information section) |
| `story.additional_information.confluence_links` | `description` (Additional Information section) |
| `story.additional_information.diagrams` | `description` (Additional Information section, if non-empty) |
| `spec_data.epic_context` | `customfield_10000` in issue payload (epic link field) |
| hardcoded `SESA780678` | `reporter.name` |
| hardcoded `Story` | `issuetype.name` |
| hardcoded `PIC` | `project.key` |

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Routing through atlas agent | Call `jira_create_issue` / `jira_batch_create_issues` directly |
| Using `*AC1.*` (single asterisk) for AC labels | Use `**AC1.**` (double asterisk) — single asterisk becomes italic |
| Using `customfield_10014` for AC | AC goes in `description`, not a separate field |
| Batch-creating all stories without pilot | Always create story #1 first, wait for user confirmation |
| Skipping epic link — not setting `customfield_10000` | Include `customfield_10000: "<epic_key>"` in every issue creation payload |
| Using ADF format | This Jira instance is Server/DC — wiki markup only, not ADF |
| "see Figma" in plain text | Wrap with `{color:orange}**see Figma**{color}` |
