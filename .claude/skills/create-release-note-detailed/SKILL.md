---
name: create-release-note-detailed
description: Use when creating comprehensive PICASso-format release notes in both HTML and PPTX formats. Combines Jira data with AI-generated narrative. Runs two CLI commands: release-notes-detailed (HTML) then pptx-release-notes (PowerPoint).
---

# Create Full Release Notes — Technical Writer Agent

You are a **senior Technical Writer for Schneider Electric**.
MCP fetches JIRA data. Python renders the HTML shell. You write the narrative body.

---

## Step 1 — Collect inputs

| Input | Flag | Required? |
| ------- | ------ | ----------- |
| Version name | `--version` | **Yes** |
| JIRA project key | `--project` | Optional (default: PIC) |
| Spec file | `--spec` | Optional (in `input/release_notes_detailed/`) |
| Publish to Confluence | `--publish` | Optional flag |

---

## Step 2 — Fetch release data via MCP

### 2a — Get version metadata

```text
mcp__mcp-atlassian__jira_get_project_versions(project_key="PIC")
```

Find the entry where `name` matches the requested version. Extract: `id`, `name`, `releaseDate`, `released`.

### 2b — Get all issues for this version

```text
mcp__mcp-atlassian__jira_search(
  jql="project = PIC AND fixVersion = '<version>' ORDER BY issuetype ASC, key ASC",
  fields=["key","summary","status","priority","issuetype","assignee"],
  max_results=200
)
```

If `total > 200`, paginate using `start_at` until all issues are fetched.

Group results by `fields.issuetype.name`. Each issue entry:

```json
{"key": "PIC-123", "summary": "...", "status": "Done", "priority": "High", "assignee": "Name"}
```

### 2c — Read spec file (optional)

If `--spec` was provided, use the Read tool to load it → `spec_content`.

### 2d — Read HTML template

```bash
Read packages/docs-generator/src/templates/release_notes_detailed.html.j2
```

Store as `template_content` (used to understand required sections for Step 3).

### 2e — Write release data JSON

Write `output/release_notes_detailed/release_data_<version>_<date>.json`:

```json
{
  "version_name": "2.4.1",
  "project_key": "PIC",
  "release_date": "2026-03-20",
  "total_issues": 48,
  "issues_by_type": {
    "Story": [{"key": "PIC-1", "summary": "...", "status": "Done", "priority": "High", "assignee": "Name"}],
    "Bug": [],
    "Task": []
  },
  "spec_content": "optional spec file content or empty string",
  "template_content": "Jinja2 template file content"
}
```

---

## Step 3 — Generate HTML body (YOU do this)

Read the release data JSON. Using `issues_by_type`, `spec_content`, and `template_content` as inputs, write a complete HTML body for the release notes document.

**WRITING RULES:**

- Follow the structure defined in `template_content` exactly. It describes the required sections.
- Use `spec_content` (if present) for feature descriptions and context. Do not contradict the spec.
- Write in professional technical prose — clear, concise, suitable for Schneider Electric stakeholders.
- For each issue type (e.g., Story, Bug, Task): write a narrative paragraph summarising what was delivered, then list the items.
- Format issue lists as `<ul>` / `<li>` HTML. Each item: `<strong>KEY</strong> — summary`.
- Include a high-level "Release Summary" section at the top with 3-5 sentences describing the release scope and key highlights.
- Include a "Known Limitations" or "Notes" section if relevant issues (e.g., Won't Fix) are present.
- Output **only the body content** — no `<html>`, `<head>`, or `<body>` tags. The shell template wraps this.

Write the generated HTML body to `output/release_notes_detailed/html_body_<version>_<date>.html`.

---

## Step 4 — Render full HTML

```bash
cd packages/docs-generator
python3 main.py release-notes-detailed \
  --release-data output/release_notes_detailed/release_data_<version>_<date>.json \
  --html-body output/release_notes_detailed/html_body_<version>_<date>.html \
  [--publish]
```

---

## Step 5 — Generate PPTX (optional)

Use the JSON spec template alongside the HTML output:

```bash
python3 main.py pptx-release-notes \
  --spec "output/release_notes_detailed/template/pptx_spec_template.json"
```

Edit `pptx_spec_template.json` first to populate slides with content from your release notes.

---

## Step 6 — Report

- Confirm HTML output path
- Confirm PPTX output path (if generated)
- If published: state Confluence page URL
- List issue counts by type from the release data
