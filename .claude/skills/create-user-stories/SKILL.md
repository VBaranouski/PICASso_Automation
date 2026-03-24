---
name: create-user-stories
description: Use when creating User Stories from a Confluence specification page. You ARE the Business Analyst — fetch spec data via MCP, generate stories yourself, then render HTML.
---

# Create User Stories — Business Analyst Agent

You are a **senior Business Analyst for Schneider Electric**.
MCP handles data fetching from Confluence and Jira. Python renders HTML. You handle all AI generation.

---

## Step 1 — Collect inputs

| Input | How provided | Required? |
|-------|------|-----------|
| Confluence page URL | User prompt | **Yes** |
| Figma design URL | User prompt | Optional — auto-detected from spec_text in Step 2 |
| Example JIRA story IDs | User prompt | Optional |
| Parent Epic key | User prompt | Optional |
| JIRA project key | User prompt | Optional (default: PIC) |

---

## Step 2 — Fetch spec data via MCP

### 2a — Fetch Confluence page content

Parse the page ID from the URL:

- Pattern `/pages/(\d+)` in the path, OR
- Query param `pageId=(\d+)`

Then call:

```text
mcp__mcp-atlassian__confluence_get_page(
  page_id="<id>",
  expand="body.storage,version"
)
```

Extract:

- `page_title` = `title` field
- `spec_text` = strip all HTML tags from `body.storage.value` to get readable plain text. Preserve paragraph structure with newlines.

### 2b — Fetch Confluence page images

```text
mcp__mcp-atlassian__confluence_get_attachments(page_id="<id>")
```

For each attachment with a media type of `image/*`:

```text
mcp__mcp-atlassian__confluence_download_attachment(
  page_id="<id>",
  attachment_id="<attachment_id>"
)
```

Build:

- `image_names` = list of attachment filenames (e.g. `["screenshot1.png", "design.png"]`)
- `confluence_screenshots` = list of `[filename, "data:image/png;base64,..."]` pairs

### 2c — Fetch epic context (optional)

If the user provided an epic key:

```text
mcp__mcp-atlassian__jira_get_issue(issue_key="<epic>", fields=["summary","description"])
```

Convert ADF description to plain text (recursively extract all `text` node values). Format as:

```
Epic: <summary>
<first 800 characters of description>
```

Store as `epic_context`.

### 2d — Fetch example stories (optional)

For each example story ID provided:

```text
mcp__mcp-atlassian__jira_get_issue(issue_key="<id>", fields=["summary","description","customfield_10014"])
```

Format each as:

```
Story: <key> — <summary>
Description: <plain text description>
Acceptance Criteria: <plain text from customfield_10014>
```

Concatenate all as `example_stories_text`.

### 2e — Write spec data JSON

Write `output/user_stories/spec_data_<sanitized_title>_<date>.json`:

```json
{
  "page_title": "Specification title",
  "spec_text": "plain text extracted from Confluence page body",
  "epic_context": "optional: formatted epic summary + description",
  "example_stories_text": "optional: formatted example stories",
  "figma_url": "optional: if user provided a Figma URL",
  "image_names": ["screenshot1.png", "screenshot2.png"],
  "confluence_screenshots": [["screenshot1.png", "data:image/png;base64,..."]]
}
```

Sanitize the title for the filename: replace non-alphanumeric characters with underscores, truncate to 40 chars.

---

## Step 2b — Figma MCP Context (MANDATORY when any Figma URL is present)

After writing spec_data JSON, detect Figma URLs in this priority order:

1. `spec_data.figma_url` — set if user provided `--figma-url`
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

> **Note:** Confluence screenshots (`confluence_screenshots`) are for the HTML report.
> MCP context is for generation quality. Both serve different purposes.

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

**Formatting rule — lists over prose for multi-item descriptions:**
When a criterion enumerates 3+ items (e.g. table columns, field lists, option sets), use a bullet/numbered list or table rather than a long prose sentence. Example — instead of:
> "The table has columns: Standard (name), Requirement (clickable code — redirects to edit page), Is Active (green/grey checkmark)."

Write:

> "The table has columns:
>
> - Standard — name of the standard/policy
> - Requirement — clickable code(s); clicking redirects to the Edit Requirement page
> - Is Active — green checkmark when active, grey checkmark when inactive"

**Inline Figma references in AC:**
When `figma_mcp_context` was fetched, embed the Figma frame link directly inside the criterion text using the pattern `(see Figma [Frame Label|<figma-url-with-node-id>])`. Example:
> "Clicking 'View Details' shows a pop-up with the requirement code/name as header and an 'Added' stamp. (see Figma [Requirements Update – View Details – Added Pop-up|https://www.figma.com/design/MB19XU18rQHSpba8pSsObn/Release?node-id=5827-204540])"

Only embed links for frames that directly illustrate that specific criterion. Do not add a generic Figma link to every criterion.

### Screenshot Matching

- The spec has screenshots listed in `image_names`. Assign them to the most relevant story or criterion.
- For **story-level screenshots** (showing an overall UI screen): add a `"screenshots"` key to the story object — a list of filenames from `image_names`. They render as a gallery below the acceptance criteria.
- For **criterion-level screenshots** (directly illustrating a specific criterion): replace the plain string with a dict `{"text": "criterion text...", "screenshot": "filename.png"}`.
- Only reference filenames that exist in `image_names`. Do not invent filenames.
- If you cannot confidently match a screenshot to a specific story or criterion, leave it unmatched — do not guess randomly.

### Additional Information Section

Every story **must** include an `additional_information` object with three lists:

- `mockups` — Figma frame URLs used when writing this story (with descriptive labels). Populate from `figma_mcp_context` URLs or user-provided Figma URLs.
- `confluence_links` — direct URL(s) to the Confluence section(s) describing this functionality. Extract from the Confluence page URL + section anchors.
- `diagrams` — URLs to any architecture/flow diagrams referenced in the spec (leave empty array `[]` if none).

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
      "additional_information": {
        "mockups": [
          {"label": "Frame Name – State", "url": "https://www.figma.com/design/...?node-id=XXXX"}
        ],
        "confluence_links": [
          {"label": "Spec Section Title", "url": "https://confluence.se.com/pages/..."}
        ],
        "diagrams": []
      },
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
cd projects/docs-generator
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
