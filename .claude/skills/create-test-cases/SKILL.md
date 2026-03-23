---
name: create-test-cases
description: Use when the user provides a Jira user story ID and wants test cases generated from it, or when manually creating test cases from acceptance criteria text
---

# Create Test Cases — Senior Lead Tester Agent

You are a **Senior Lead Tester for Schneider Electric**.
MCP fetches JIRA story data. Python renders HTML. You handle all AI generation.

---

## Step 1 — Collect inputs

Get from the user:

- **Story ID(s)** — e.g., `PROJ-452` (required, repeatable)
- **Figma URL** — optional; if not provided, will be auto-detected from story description and acceptance criteria in Step 2b

---

## Step 2 — Fetch story data via MCP

For each story ID, call:

```text
mcp__mcp-atlassian__jira_get_issue(
  issue_key="PROJ-452",
  fields=["summary","status","priority","assignee","description","customfield_10014","attachment"]
)
```

> `customfield_10014` = Acceptance Criteria on this Jira instance.

From the response, extract:

| Field | Source |
|---|---|
| `key` | `issue.key` |
| `summary` | `fields.summary` |
| `description` | `fields.description` — convert ADF to plain text (see below) |
| `acceptance_criteria` | `fields.customfield_10014` — convert ADF to plain text |
| `status` | `fields.status.name` |
| `priority` | `fields.priority.name` |
| `assignee` | `fields.assignee.displayName` (or empty string if null) |

**ADF → plain text:** Recursively walk the `content` tree and collect all `text` node values, joining with newlines at paragraph/heading boundaries.

**Screenshots (attachments):** For any attachment with a `.png`, `.jpg`, or `.jpeg` mime type, call:

```text
mcp__mcp-atlassian__jira_download_attachments(
  issue_key="PROJ-452",
  attachment_ids=["<id1>", "<id2>"]
)
```

Each result is a base64-encoded image. Build `story_screenshots` as `[["filename.png", "data:image/png;base64,..."], ...]`.

Write the following JSON to `output/test_cases/story_data_<STORY-ID>_<date>.json`:

```json
{
  "key": "PROJ-452",
  "summary": "...",
  "description": "plain text",
  "acceptance_criteria": "plain text",
  "status": "In Progress",
  "priority": "High",
  "assignee": "Name",
  "story_screenshots": [["filename.png", "data:image/png;base64,..."]]
}
```

Process one story at a time — separate JSON files.

---

## Step 2b — Figma MCP Context (use if present)

After reading story_data JSON, scan for Figma URLs in:

1. Any URL provided by the user in the prompt (from Step 1)
2. `story_data.description`
3. Each entry in `story_data.acceptance_criteria`

Regex: `https://(?:www\.)?figma\.com/design/[A-Za-z0-9]+/[^\s"'<>?#]*(?:\?[^\s"'<>]*)?`

**URL parsing:**

- `fileKey` = second path segment after `/design/`
- `nodeId` = `node-id` query param with `-` replaced by `:` (e.g. `2047-19828` → `2047:19828`)

If found, call:

```text
mcp__plugin_figma_figma__get_design_context(fileKey="...", nodeId="...")
```

Store the result as **`figma_mcp_context`** for use in Step 3.

If not found: check `story_data.story_screenshots` (list of `[filename, data_url]` pairs fetched from JIRA attachments). If non-empty, extract to temp files and read them:

```bash
python3 -c "
import json, base64
d = json.load(open('<story_data_file>'))
for i, (name, url) in enumerate(d.get('story_screenshots', [])):
    img = base64.b64decode(url.split(',', 1)[1])
    path = f'/tmp/story_screenshot_{i}.png'
    open(path, 'wb').write(img)
    print(path, name)
"
```

Use the Read tool to view each saved image. Apply the same rules as `figma_mcp_context`: reference actual UI element names in `test_steps`, add test cases for design-visible states not in AC.

If neither Figma URL nor screenshots are available: proceed on JIRA data alone.

---

## Step 3 — Generate test cases (YOU do this)

For each story, read its data JSON. Generate a comprehensive set of test cases following these rules:

**CRITICAL RULES:**

- Base test cases ONLY on the story's acceptance criteria and description. Do NOT invent requirements.
- Every test case must trace back to a specific acceptance criterion or described behaviour.
- Test steps must be concrete and executable — a junior tester must be able to follow them step by step.
- Cover: all happy paths, all negative cases, all edge cases, permission/role boundaries, and error/validation states.
- Minimum 8 test cases per story. Complex stories: 15+.
- If `figma_mcp_context` is available from Step 2b: use actual element names in `test_steps` (specific button labels, field names from the design), and add test cases for design-visible states not explicitly mentioned in acceptance criteria (e.g. loading states, empty states, error states visible in mockups).

**TEST TYPES — generate all three:**

- `"Positive"` — valid input, expected happy path
- `"Negative"` — invalid input, forbidden actions, error states
- `"Edge Case"` — boundary values, empty states, concurrent actions, unusual but valid scenarios

**PRIORITY:**

- `"High"` — blocks core functionality if it fails
- `"Medium"` — important but has a workaround
- `"Low"` — minor or cosmetic

**JSON schema — each test case:**

```json
{
  "id": "TC-001",
  "title": "Short descriptive title of what is being tested",
  "preconditions": "System state required before the test (user logged in, feature enabled, etc.)",
  "test_steps": [
    "Step 1: Navigate to ...",
    "Step 2: Click ...",
    "Step 3: Enter ..."
  ],
  "expected_result": "What the system should do/display after the steps complete",
  "priority": "High | Medium | Low",
  "test_type": "Positive | Negative | Edge Case"
}
```

Write the generated JSON array to `output/test_cases/test_cases_<STORY-ID>_<date>.json`.
Process one story at a time — separate JSON files.

---

## Step 4 — Render HTML

For each story:

```bash
cd projects/docs-generator
python3 main.py test-cases \
  --story-data output/test_cases/story_data_<STORY-ID>_<date>.json \
  --test-cases-json output/test_cases/test_cases_<STORY-ID>_<date>.json
```

---

## Step 5 — Report

- Confirm the HTML output path per story
- State: N test cases generated per story (breakdown by type: X positive, Y negative, Z edge)
- Flag any acceptance criteria that were ambiguous or lacked testable detail
