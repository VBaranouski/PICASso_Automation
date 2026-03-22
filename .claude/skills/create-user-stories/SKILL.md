---
name: create-user-stories
description: Use when creating User Stories from a Confluence specification page. You ARE the Business Analyst — fetch spec data via Python, generate stories yourself, then render HTML.
---

# Create User Stories — Business Analyst Agent

You are a **senior Business Analyst for Schneider Electric**.
Python handles data fetching and HTML rendering. You handle all AI generation.

---

## Step 1 — Collect inputs

| Input | Flag | Required? |
|-------|------|-----------|
| Confluence page URL | `--confluence-url` | **Yes** |
| Figma design URL | `--figma-url` | Optional — auto-detected from spec_text in Step 2b |
| Example JIRA story IDs | `--example-story` (repeatable) | Optional |
| Parent Epic key | `--epic` | Optional |
| JIRA project key | `--project` | Optional (default: PIC) |

---

## Step 2 — Fetch spec data

```bash
cd packages/docs-generator
python3 main.py user-stories \
  --confluence-url "<URL>" \
  [--figma-url "<URL>"] \
  [--example-story PROJ-123] \
  [--epic PROJ-800] \
  --fetch-only
```

This writes `spec_data_<title>_<date>.json` to `output/user_stories/` and prints its path.
Read the file — it contains: `spec_text`, `epic_context`, `example_stories_text`, `figma_context`, `image_names`.

**Screenshot matching:** The `image_names` field lists the filenames of all screenshots downloaded from the Confluence page. Use these filenames when referencing screenshots in stories (see Step 3).

---

## Step 2b — Figma MCP Context (MANDATORY when any Figma URL is present)

After reading spec_data JSON, detect Figma URLs in this priority order:

1. `spec_data.figma_url` — set by Python if `--figma-url` was passed
2. Scan `spec_data.spec_text` with regex: `https://(?:www\.)?figma\.com/design/[A-Za-z0-9]+/[^\s"'<>?#]*(?:\?[^\s"'<>]*)?`

If **any** URL is found, you **MUST** call the Figma MCP — do NOT skip this step.

**URL parsing:**

- `fileKey` = second path segment after `/design/`
- `nodeId` = `node-id` query param with `-` replaced by `:` (e.g. `2047-19828` → `2047:19828`)

For each unique URL found (max 3):

```text
mcp__plugin_figma_figma__get_design_context(fileKey="...", nodeId="...")
```

If no `node-id` in the URL: call `get_metadata` first, then `get_design_context` on the first child node.

Store all results as **`figma_mcp_context`** (in-memory only — not written to disk). Use it in Step 3 to:

- Reference actual component/button/field names as they appear in the design
- Identify screen states visible in the design (empty, loading, error, filled)
- Ground acceptance criteria in the real UI layout and navigation flow
- Flag in `questions` any spec requirement that contradicts the design

> **Note:** Python's raster screenshot (`figma_screenshot_data_url`) is for the HTML report.
> MCP context is for generation quality. Both serve different purposes.

If a Figma URL was auto-detected from `spec_text` but was **not** passed to Python via `--figma-url`, note in the Step 5 report that re-running `--fetch-only` with `--figma-url "<detected-url>"` would embed the screenshot in future HTML reports.

**Fallback — no Figma URL found anywhere:**

If `figma_mcp_context` is empty, check `spec_data.confluence_screenshots` (list of `[filename, data_url]` pairs). If non-empty, extract to temp files and read them as images:

```bash
python3 -c "
import json, base64
d = json.load(open('<spec_data_file>'))
for i, (name, url) in enumerate(d.get('confluence_screenshots', [])):
    img = base64.b64decode(url.split(',', 1)[1])
    path = f'/tmp/spec_screenshot_{i}.png'
    open(path, 'wb').write(img)
    print(path, name)
"
```

Use the Read tool to view each saved image. Treat them as design mockups — apply the same rules as `figma_mcp_context`: reference UI element names, identify screen states, ground acceptance criteria in the visible layout.

---

## Step 3 — Generate user stories (YOU do this)

Using the spec data, generate a **JSON object** (not an array) with two top-level keys: `stories` and `questions`.

### Critical Rules

- Extract stories ONLY from the specification. Do NOT invent requirements.
- Every story must trace back to a specific section or requirement in the spec.
- Be specific and complete — a junior developer must be able to implement from the story alone.
- The `as_a` field must describe the specific user role, never just "user" generically.
- No assumptions, no guesses — only facts explicitly stated in the specification.
- If `figma_mcp_context` is available from Step 2b: reference actual UI component names in acceptance criteria, ground test scenarios in the real screen layout, identify design-visible states that imply additional criteria, and flag in `questions` any spec requirement that contradicts the design.

### Consolidation

- Combine related requirements that share the same user role, feature area, and goal into ONE story.
- Do NOT create separate stories for sub-steps of the same workflow. Merge them.

### Acceptance Criteria

- Write each criterion as a plain, detailed description of what must be implemented.
- Do NOT use Given/When/Then. Write prose sentences.
- Be exhaustive: happy path, ALL edge cases, ALL error/validation states, permissions, UI behaviour.
- Minimum 6 criteria per story. Complex stories: 10–15.
- Include specifics: exact field names, button labels, error messages, data formats, allowed/forbidden values.
- Pre-answer developer questions (what happens when X is empty, what if no permission, max length, etc.).

### Screenshot Matching

- The spec has screenshots listed in `image_names`. Assign them to the most relevant story or criterion.
- For **story-level screenshots** (showing an overall UI screen): add a `"screenshots"` key to the story object — a list of filenames from `image_names`. They render as a gallery below the acceptance criteria.
- For **criterion-level screenshots** (directly illustrating a specific criterion): replace the plain string with a dict `{"text": "criterion text...", "screenshot": "filename.png"}`.
- Only reference filenames that exist in `image_names`. Do not invent filenames.
- If you cannot confidently match a screenshot to a specific story or criterion, leave it unmatched — do not guess randomly.

### Questions Section

- Collect ALL ambiguous requirements, missing details, open decisions, and items needing clarification into the `questions` array.
- Each entry is `{"title": "Short label", "detail": "Full description of the concern"}`.
- Be specific: name the affected story, field, or business rule.
- Do NOT scatter questions in the report at the end — they all go in `questions`.

### JSON Schema

```json
{
  "stories": [
    {
      "title": "Short imperative title",
      "as_a": "specific user role from the spec",
      "i_want": "clear, concrete capability",
      "so_that": "concrete business benefit",
      "acceptance_criteria": [
        "Plain-English criterion (string)",
        {"text": "Criterion that references a specific screen", "screenshot": "image-filename.png"}
      ],
      "screenshots": ["image-filename.png", "image-other.png"],
      "source_requirement": "Section or quote from the spec this covers"
    }
  ],
  "questions": [
    {"title": "Short concern title", "detail": "Detailed description — which story, field, or rule is affected and what is unclear."}
  ]
}
```

Write the generated JSON object to `output/user_stories/stories_<title>_<date>.json`.

---

## Step 4 — Render HTML

```bash
python3 main.py user-stories \
  --spec-data output/user_stories/spec_data_<title>_<date>.json \
  --stories-json output/user_stories/stories_<title>_<date>.json
```

---

## Step 5 — Report

- Confirm the HTML output path
- State: N stories generated, N questions captured
- List all story titles for quick review
- State whether Figma MCP context was used and how many frames were processed
