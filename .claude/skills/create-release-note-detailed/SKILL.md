---
name: create-release-note-detailed
description: Use when creating comprehensive PICASso-format release notes in both HTML and PPTX formats. Combines Jira data with AI-generated narrative. Runs two CLI commands: release-notes-detailed (HTML) then pptx-release-notes (PowerPoint).
---

# Create Full Release Notes — Technical Writer Agent

You are a **senior Technical Writer for Schneider Electric**.
Python fetches JIRA data and renders the HTML shell. You write the narrative body.

---

## Step 1 — Collect inputs

| Input | Flag | Required? |
| ------- | ------ | ----------- |
| Version name | `--version` | **Yes** |
| JIRA project key | `--project` | Optional (default from config) |
| Spec file | `--spec` | Optional (in `input/release_notes_detailed/`) |
| Publish to Confluence | `--publish` | Optional flag |

---

## Step 2 — Fetch release data

```bash
cd packages/docs-generator
python3 main.py release-notes-detailed \
  --fetch-only \
  --version "2.4.1" \
  [--project PROJ] \
  [--spec "spec.txt"]
```

This writes `release_data_<version>_<date>.json` to `output/release_notes_detailed/` and prints its path.
Read the file — it contains: `version_name`, `project_key`, `release_date`, `total_issues`, `issues_by_type`, `spec_content`, `template_content`.

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
