---
name: create-release-notes-short
description: Use when creating Yammer-format release notes from a JIRA version. Fetches fixed issues from Jira, generates a clean HTML summary, and optionally publishes to Confluence for Yammer distribution.
---

# Create Release Notes for Yammer

Generate release notes from a Jira version and optionally publish to Confluence.
MCP fetches Jira data. Python renders HTML. No AI generation step.

## Step 1 — Gather inputs

Ask the user for:

- **Version name or ID** (e.g., `2.4.1` or `173186`) — required
- **Project key** (e.g., `PIC`) — optional, uses config default if omitted
- **Release date override** — optional (e.g., `28 March 2026`)
- **Style** — optional (`default` or `hacker`)
- **Publish to Confluence?** — optional flag

---

## Step 2 — Fetch issues via MCP

### 2a — Get version metadata (if version name provided)

```text
mcp__mcp-atlassian__jira_get_project_versions(project_key="PIC")
```

Find the entry matching the requested version name or ID. Extract: `id`, `name`, `releaseDate`, `released`, `description`.

### 2b — Get all issues for this version

```text
mcp__mcp-atlassian__jira_search(
  jql="project = PIC AND fixVersion = '<version>' ORDER BY issuetype ASC, key ASC",
  fields=["key","summary","status","priority","issuetype","assignee"],
  max_results=200
)
```

If `total > 200`, paginate using `start_at` until all issues are fetched.

Group results by `fields.issuetype.name`.

### 2c — Write release data JSON

Write `output/release_notes_short/release_data_short_<version>_<date>.json`:

```json
{
  "version_name": "2.4.1",
  "version_description": "Optional description",
  "release_date": "28 March 2026",
  "released": true,
  "project_key": "PIC",
  "total_issues": 48,
  "generated_date": "2026-03-22",
  "issues_by_type": {
    "Story": [{"key": "PIC-1", "summary": "...", "status": "Done", "priority": "High", "issue_type": "Story", "assignee": "Name"}],
    "Bug": []
  }
}
```

---

## Step 3 — Render HTML

```bash
cd projects/docs-generator
python3 main.py release-notes-short \
  --release-data output/release_notes_short/release_data_short_<version>_<date>.json \
  [--style hacker] \
  [--publish]
```

Output: `output/release_notes_short/release_notes_short_<version>.html`

---

## Step 4 — Report

- Confirm the output HTML file path
- If `--publish` was used: confirm the Confluence page URL
- Summarize: number of issues included, categories covered
