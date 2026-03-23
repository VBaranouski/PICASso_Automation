# CLAUDE.md — PICASso Platform

Monorepo containing two packages for the PICASso QA & documentation platform.

---

## `packages/docs-generator/` — SE-DevTools (Python)

Python Click CLI for automated documentation generation with Jira, Confluence, Figma, and Claude AI integrations.

### Commands

Run all commands from `packages/docs-generator/`:

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
cd packages/docs-generator
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

---

## `packages/pw-autotest/` — PW-MCP AutoTest (TypeScript)

AI-assisted Playwright test automation framework with Allure 3 reporting and Claude MCP integration.

### Project Purpose & Workflow

Two-phase framework:

1. **Phase 1 — AI Exploration**: Claude reads specs, opens a real browser via Playwright MCP, observes the DOM, and generates Playwright TypeScript tests.
2. **Phase 2 — Execution**: Tests run via `npx playwright test` with Allure 3 + Playwright HTML dual reporting.

### Commands & Setup

```bash
# From packages/pw-autotest/
npm test
TEST_ENV=qa npm test        # target environment (dev/qa/ppr)
npm run test:chromium
npm run test:smoke          # @smoke tag
npm run test:headed
npm run report:allure

npm ci
npx playwright install --with-deps
```

### Project Structure

```
packages/pw-autotest/
├── tests/                        # Playwright tests
├── src/
│   ├── locators/                 # Element selectors only (factory functions)
│   ├── pages/                    # Page Object Models
│   ├── components/               # Reusable UI components (OSDropdown, Modal)
│   ├── fixtures/                 # Page object initialization, auth state
│   ├── helpers/                  # api.helper.ts, data.helper.ts, wait.helper.ts
│   └── types/                    # env.d.ts, test-data.types.ts, pages.types.ts
└── config/
    ├── playwright.config.ts
    ├── allure.config.ts
    ├── environments/             # Per-environment base URLs
    └── users/                    # Credentials per env (gitignored)
```

### Test Generation

All test generation rules are in `.claude/skills/create-automation-scripts/SKILL.md`.

- **In conversation**: invoke the `/create-automation-scripts` skill
- **Subagent**: the `automation-tester` agent reads SKILL.md as its first step

---

## Shared Directories

- **`input/`** — Input files for docs-generator (transcripts, spec files)
- **`output/`** — Generated artifacts (release notes, meeting notes, test cases, bug reports)

Both referenced from `packages/docs-generator/config.yaml` via `../../input/` and `../../output/`.

---

## MCP Configuration

Root `.claude/settings.json` configures three MCP servers:

- **`atlassian`** — Jira + Confluence (`uvx mcp-atlassian --env-file .env`). Provides `jira_*` and `confluence_*` tools.
- **`playwright`** — Browser automation for test generation.
- **`sequential-thinking`** — Extended reasoning server.

| Task | Tool |
| --- | --- |
| Fetch Jira issues, versions, stories | MCP `jira_*` tools |
| Fetch Confluence pages, attachments | MCP `confluence_*` tools |
| Render HTML / PPTX output | Python CLI |

**Rule for new skills:** Any new skill that needs Jira or Confluence data **must** use MCP tools directly. Do not add new Python fetch commands.

---

## CI/CD

- `.github/workflows/playwright.yml` — Playwright tests (triggered by pw-autotest changes)
- `.github/workflows/docs.yml` — Python lint & validation (triggered by docs-generator changes)
- `.github/workflows/claude.yml` — Claude GitHub Action (@claude mentions)
- `.github/workflows/claude-code-review.yml` — Automated PR code review

---

## Coding Standards

All generated code MUST follow these conventions — read them before writing any TypeScript or test code:

- **TypeScript Conventions** → `.claude/conventions/typescript-conventions.md`
- **Testing Patterns** → `.claude/conventions/testing-patterns.md`

Key rules:
- Locators → `src/locators/*.locators.ts` only, factory function pattern
- Page Objects → actions + assertions only, no inline locators
- Components → for any UI pattern used in 2+ pages
- Fixtures → page object initialization only, never inside test files
- Tests → business logic only, no `expect()`, no `page.locator()` calls
- Never use `waitForTimeout()`, `selectOption()`, XPath, or CSS class selectors
