# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env   # fill in JIRA_*, CONFLUENCE_*, FIGMA_API_TOKEN, ANTHROPIC_API_KEY
```

## Commands

```bash
# Release notes from a JIRA version
python main.py release-notes --version "2.4.1" [--project PROJ] [--publish]

# Full AI-generated release notes (PICASso format)
python main.py full-release-notes --version "2.4.1" [--project PROJ] [--spec "spec.txt"] [--publish]

# Meeting notes from a transcript file in input/transcripts/
python main.py meeting-notes --file "standup.txt"
python main.py meeting-notes --all        # process every .txt in input/transcripts/

# Test cases from one or more JIRA user stories
python main.py test-cases --story PROJ-452 [--story PROJ-453 ...]

# PPTX release notes from a JSON spec file
python main.py pptx-release-notes --spec "output/full_release_notes/template/pptx_spec_template.json"

# Bug & defect report (SIT / UAT / Production sections)
python main.py bug-report                  # default corporate style
python main.py bug-report --style hacker   # dark terminal hacker style

# Executive email summary for SVP/VP audience
python main.py email-summary

# Story coverage — which user stories were tested via linked defects
python main.py story-coverage

# Help
python main.py --help
python main.py <command> --help
```

## Architecture

The project follows a three-layer pipeline: **clients -> generators -> templates**.

### Config is loaded once at CLI startup

`src/config/settings.py` merges `.env` (secrets) with `config.yaml` (non-secret config) into a single `Settings` dataclass. All other modules receive `Settings` via constructor injection. The CLI (`main.py`) calls `load_settings()` in the Click group callback and passes it via `ctx.obj`.

### Clients fetch, generators orchestrate, templates render

- **`src/clients/`** -- thin REST wrappers (`JiraClient`, `ConfluenceClient`, `FigmaClient`) that return typed dataclasses (`JiraIssue`, `JiraVersion`, `FigmaFileInfo`). No business logic here.
- **`src/ai/claude_client.py`** -- wraps the Anthropic SDK. Both AI methods (`summarize_transcript`, `generate_test_cases`) instruct Claude via system prompts to return **JSON only**. `_parse_json_response()` strips markdown fences and parses the JSON into typed dataclasses.
- **`src/generators/`** -- each generator receives its dependencies (clients, Claude) by constructor. The `generate()` method runs the full pipeline and returns output file paths.
- **`src/templates/*.html.j2`** -- Jinja2 templates own all HTML. SE brand colors are passed as the `branding` variable from `Settings`, so colors never appear hardcoded in Python.

### Generators overview

| Generator                  | File                                    | Template(s)                                                  | JIRA? | AI? |
| -------------------------- | --------------------------------------- | ------------------------------------------------------------ | ----- | --- |
| `ReleaseNotesGenerator`    | `src/generators/release_notes.py`       | `release_notes.html.j2`                                      | Yes   | No  |
| `FullReleaseNotesGenerator`| `src/generators/full_release_notes.py`  | `full_release_notes.html.j2`                                 | Yes   | Yes |
| `MeetingNotesGenerator`    | `src/generators/meeting_notes.py`       | `meeting_notes.html.j2`                                      | No    | Yes |
| `TestCasesGenerator`       | `src/generators/test_cases.py`          | `test_cases.html.j2`                                         | Yes   | Yes |
| `PptxReleaseNotesGenerator` | `src/generators/pptx_release_notes.py` | N/A (programmatic python-pptx)                               | No    | No  |
| `BugReportGenerator`       | `src/generators/bug_report.py`          | `bug_report_default.html.j2`, `bug_report_hacker.html.j2`    | Yes   | No  |
| `EmailSummaryGenerator`    | `src/generators/email_summary.py`       | `email_summary.html.j2`                                      | Yes   | No  |
| `StoryCoverageGenerator`   | `src/generators/story_coverage.py`      | `story_coverage.html.j2`                                     | Yes   | No  |

### Template styles

`BugReportGenerator` supports a `--style` option. Templates are named `bug_report_{style}.html.j2`:

- **`default`** -- clean corporate SE green card layout (white background, material design colors)
- **`hacker`** -- dark terminal/hacker aesthetic (dark background, neon cyan/green glows, JetBrains Mono font)

To add a new style, create `src/templates/bug_report_{name}.html.j2` and add the name to `BugReportGenerator._STYLES`.

### Auth -- JIRA vs Confluence vs Figma

- **JIRA** (Server/DC): `Authorization: Basic <pre-encoded-base64-token>` -- the token in `.env` is already `base64(username:PAT)`, used verbatim as the Basic header value. API is **v2** (not v3 -- this is not Atlassian Cloud).
- **Confluence** (Server/DC): `Authorization: Bearer <PAT>` -- the token is a raw PAT used directly.
- **Figma** (Cloud): `X-Figma-Token` header with a personal access token. API base is `https://api.figma.com`. No SSL workarounds needed.
- JIRA and Confluence require `verify=False` (internal corporate SSL certificate, not publicly trusted).
- Confluence API base is `/rest/api` (no `/wiki` prefix on this instance).

### Figma integration

`FigmaClient` (`src/clients/figma_client.py`) connects to the Figma REST API for exporting screenshots from design files. Key capabilities:

- **`test_connection()`** -- verify API token by fetching `/v1/me`
- **`get_file(file_key)`** -- fetch file metadata (name, version, thumbnail)
- **`get_image_urls(file_key, node_ids)`** -- request rendered PNG/SVG URLs for specific nodes
- **`export_screenshot(file_key, node_ids, output_dir)`** -- download and save screenshots locally
- **`screenshot_from_url(figma_url, output_dir)`** -- parse a Figma URL and export screenshots in one call
- **`parse_figma_url(url)`** -- extract `file_key` and `node_id` from Figma URLs (`/file/`, `/design/`, `/proto/` formats)

Token is stored in `.env` as `FIGMA_API_TOKEN` (optional -- only needed for Figma commands). Config is loaded into `Settings.figma` (`FigmaConfig` dataclass).

### JIRA field mapping

`customfield_10016` = Story Points, `customfield_10014` = Acceptance Criteria. These are instance-specific -- adjust in `config.yaml` under `jira.fields_to_fetch` and in `jira_client.py:_parse_issue()` if your JIRA instance uses different custom field IDs.

### JiraIssue dataclass fields

`key`, `summary`, `status`, `priority`, `issue_type`, `assignee`, `story_points`, `description`, `acceptance_criteria`, `reporter`, `created`, `parent_story_key`, `parent_story_summary`. The last four are used by `bug-report`, `story-coverage`, and `email-summary` commands.

### JIRA JQL patterns for bug reports

- SIT: `issuetype in (Bug, Defect)` filtered by SESA ID reporters
- UAT: `issuetype = Bug` filtered by mixed SESA ID + display-name reporters
- Production: `issuetype = Defect` filtered by display-name reporters
- Reporter lists and start dates are class-level constants in `BugReportGenerator`
- Mixed ID/name JQL: `AND (reporter in (ID1, ID2) OR reporter = "Name1" OR reporter = "Name2")`
- Results are sorted Python-side by `_PRIORITY_ORDER` dict (Blocker > Critical > High > Medium > Low)

### Parent story detection

`_parse_issue()` checks both `parent` field (JIRA hierarchy) and `issuelinks` (manual links) to find parent Story/Feature/Epic. Used by `story-coverage` for grouping defects by user story.

### JIRA description format

JIRA REST API v3 returns descriptions as **Atlassian Document Format (ADF)** JSON, not plain text. `JiraClient._adf_to_text()` recursively extracts plain text from ADF nodes for use in templates and AI prompts.

### Confluence publishing

Confluence publishing is **opt-in only** via the `--publish` flag on `release-notes` and `full-release-notes`. `ConfluenceClient.publish_release_notes()` checks for an existing page by title and creates or updates accordingly.

### Output file naming

Controlled by patterns in `config.yaml` under `output.*_filename_pattern`. Unsafe characters in version names or transcript stems are replaced with underscores by `file_utils.sanitize_filename()`. Bug reports, email summaries, and story coverage output to `output/bug_reports/`.

### HTML branding

Jinja2 templates use CSS variables driven by `branding.*` values from `config.yaml`. To restyle, only `config.yaml` needs to change -- no template edits required. The hacker-style template uses its own self-contained CSS.

### Status badge color mapping (bug report templates)

- **Red**: statuses containing "failed" (e.g. SIT Failed, UAT Failed)
- **Yellow**: Open, To Do, Reopened, New, Assigned
- **Purple**: statuses containing "progress", "review", or "development"
- **Grey**: statuses containing "pending", "on hold", or "change request"
- **Green**: all other statuses (treated as closed/resolved)

### Jinja2 autoescape caveat

Templates use `autoescape=True`. Do not use HTML entities like `&nbsp;` in Jinja2 expressions (e.g. `join()` separators) -- they get double-escaped to `&amp;nbsp;`. Use plain text equivalents instead.
