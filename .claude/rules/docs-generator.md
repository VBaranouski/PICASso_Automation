## `projects/docs-generator/` — SE-DevTools (Python)

Python Click CLI for automated documentation generation with Jira, Confluence, Figma, and Claude AI integrations.

### Commands

Run all commands from `projects/docs-generator/`:

```bash
python3 main.py release-notes-short --version "2.4.1" [--project PROJ] [--publish]
python3 main.py release-notes-detailed --version "2.4.1" [--project PROJ] [--spec "spec.txt"] [--publish]
python3 main.py meeting-notes --file "standup.txt"
python3 main.py meeting-notes --all
python3 main.py test-cases --story PROJ-452 [--story PROJ-453 ...]
python3 main.py pptx-release-notes --spec "output/release_notes_detailed/template/pptx_spec_template.json"
python3 main.py bug-report [--style hacker]
python3 main.py email-summary
python3 main.py story-coverage
python3 main.py --help
```

### Setup

```bash
cd projects/docs-generator
pip install -r requirements.txt
cp .env.example .env   # .env lives at repo root
```

### Architecture

Three-layer pipeline: **clients → generators → Jinja2 templates**.

`src/config/settings.py` merges `.env` (secrets) with `config.yaml` (non-secret config) into a single `Settings` dataclass passed via Click `ctx.obj`.

**MCP integration (Claude Code skills):** Skills use the `mcp-atlassian` MCP server directly for all Jira and Confluence data fetching. Python is invoked only for HTML/PPTX rendering via `--release-data`, `--story-data`, `--spec-data`, or `--stories-json` flags. `JiraClient` and `ConfluenceClient` are used internally only by `bug-report`, `email-summary`, `story-coverage` (no MCP skill for these).

**Generators:**

| Generator | File | JIRA? | AI? |
| --- | --- | --- | --- |
| `ReleaseNotesGenerator` | `src/generators/release_notes_short.py` | Yes | No |
| `FullReleaseNotesGenerator` | `src/generators/release_notes_detailed.py` | Yes | Yes |
| `MeetingNotesGenerator` | `src/generators/meeting_notes.py` | No | Yes |
| `TestCasesGenerator` | `src/generators/test_cases.py` | Yes | Yes |
| `PptxReleaseNotesGenerator` | `src/generators/pptx_release_notes.py` | No | No |
| `BugReportGenerator` | `src/generators/bug_report.py` | Yes | No |
| `EmailSummaryGenerator` | `src/generators/email_summary.py` | Yes | No |
| `StoryCoverageGenerator` | `src/generators/story_coverage.py` | Yes | No |

### Auth

- **JIRA** (Server/DC): `Authorization: Basic <pre-encoded-base64-token>` — token in `.env` is already `base64(username:PAT)`, used verbatim. API is **v2** (not v3 — not Atlassian Cloud).
- **Confluence** (Server/DC): `Authorization: Bearer <PAT>` — raw PAT. API base is `/rest/api` (no `/wiki` prefix on this instance).
- **Figma** (Cloud): `X-Figma-Token` header.
- JIRA and Confluence require `verify=False` (internal corporate SSL certificate).

### JIRA details

- `customfield_10016` = Story Points, `customfield_10014` = Acceptance Criteria (instance-specific — adjust in `config.yaml` and `jira_client.py:_parse_issue()` if needed).
- ADF: JIRA API v2 returns descriptions as Atlassian Document Format JSON. `JiraClient._adf_to_text()` recursively extracts plain text.
- `_parse_issue()` checks both `parent` field and `issuelinks` to find parent Story/Feature/Epic.
- JQL for bug reports: SIT uses SESA ID reporters; UAT uses mixed SESA ID + display-name; Prod uses display-name. Priority sort: Blocker > Critical > High > Medium > Low.

### Templates

- `BugReportGenerator` supports `--style default` (SE green) and `--style hacker` (dark terminal). To add a style: create `src/templates/bug_report_{name}.html.j2` and add to `BugReportGenerator._STYLES`.
- CSS variables are driven by `branding.*` in `config.yaml`.
- `autoescape=True`: do not use HTML entities like `&nbsp;` in Jinja2 expressions — they get double-escaped. Use plain text.
- Status badge colors: Red = "failed", Yellow = open/new/assigned, Purple = in-progress/review, Grey = pending/on-hold, Green = everything else.

### Output

- Filename patterns controlled by `config.yaml` under `output.*_filename_pattern`.
- Bug reports, email summaries, story coverage → `output/bug_reports/`.

### Testing Guidelines

- Mock all external API calls (JIRA, Confluence, Figma, Anthropic) — never hit live services in tests.
- Test ADF-to-text conversion (`JiraClient._adf_to_text()`) and config loading with missing/invalid `.env`.
