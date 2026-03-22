# CLAUDE.md — PICASso Platform

Monorepo containing two packages for the PICASso QA & documentation platform.

---

## `packages/docs-generator/` — SE-DevTools (Python)

Python Click CLI for automated documentation generation with Jira, Confluence, Figma, and Claude AI integrations.

### Commands

Run all commands from `packages/docs-generator/`:

```bash
# Release notes — simple Yammer-style HTML table from a JIRA version
python3 main.py release-notes-short --version "2.4.1" [--project PROJ] [--publish]

# Release notes — full AI-generated document (PICASso format)
python3 main.py release-notes-detailed --version "2.4.1" [--project PROJ] [--spec "spec.txt"] [--publish]

# Meeting notes from a transcript file in input/transcripts/
python3 main.py meeting-notes --file "standup.txt"
python3 main.py meeting-notes --all        # process every .txt in input/transcripts/

# Test cases from one or more JIRA user stories
python3 main.py test-cases --story PROJ-452 [--story PROJ-453 ...]

# PPTX release notes from a JSON spec file
python3 main.py pptx-release-notes --spec "output/release_notes_detailed/template/pptx_spec_template.json"

# Bug & defect report (SIT / UAT / Production sections)
python3 main.py bug-report                  # default corporate style
python3 main.py bug-report --style hacker   # dark terminal hacker style

# Executive email summary for SVP/VP audience
python3 main.py email-summary

# Story coverage — which user stories were tested via linked defects
python3 main.py story-coverage

python3 main.py --help
python3 main.py <command> --help
```

### Setup

```bash
cd packages/docs-generator
pip install -r requirements.txt
# .env lives at repo root — copy the example and fill in your tokens:
cp .env.example .env
```

### Architecture

Three-layer pipeline: **clients → generators → Jinja2 templates**.

`src/config/settings.py` merges `.env` (secrets) with `config.yaml` (non-secret config) into a single `Settings` dataclass. All other modules receive `Settings` via constructor injection. The CLI (`main.py`) calls `load_settings()` in the Click group callback and passes it via `ctx.obj`.

**MCP integration (Claude Code skills):** Skills in `.claude/skills/` use the `mcp-atlassian` MCP server directly for all Jira and Confluence data fetching — they do **not** call `python3 main.py --fetch-only`. Python is invoked only for HTML/PPTX rendering via `--release-data`, `--story-data`, `--spec-data`, or `--stories-json` flags. `JiraClient` and `ConfluenceClient` are still used internally by `bug-report`, `email-summary`, `story-coverage` (full-pipeline commands with no MCP skill).

**Layers:**

- **`src/clients/`** — thin REST wrappers (`JiraClient`, `ConfluenceClient`, `FigmaClient`) that return typed dataclasses (`JiraIssue`, `JiraVersion`, `FigmaFileInfo`). No business logic here.
- **`src/ai/claude_client.py`** — wraps the Anthropic SDK. Both AI methods (`summarize_transcript`, `generate_test_cases`) instruct Claude via system prompts to return **JSON only**. `_parse_json_response()` strips markdown fences and parses the JSON into typed dataclasses.
- **`src/generators/`** — each generator receives its dependencies (clients, Claude) by constructor. The `generate()` method runs the full pipeline and returns output file paths.
- **`src/templates/*.html.j2`** — Jinja2 templates own all HTML. SE brand colors are passed as the `branding` variable from `Settings`, so colors never appear hardcoded in Python.

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

- **JIRA** (Server/DC): `Authorization: Basic <pre-encoded-base64-token>` — the token in `.env` is already `base64(username:PAT)`, used verbatim. API is **v2** (not v3 — this is not Atlassian Cloud).
- **Confluence** (Server/DC): `Authorization: Bearer <PAT>` — raw PAT used directly. API base is `/rest/api` (no `/wiki` prefix on this instance).
- **Figma** (Cloud): `X-Figma-Token` header. API base `https://api.figma.com`. No SSL workarounds needed.
- JIRA and Confluence require `verify=False` (internal corporate SSL certificate).

### JIRA details

- `customfield_10016` = Story Points, `customfield_10014` = Acceptance Criteria (instance-specific — adjust in `config.yaml` and `jira_client.py:_parse_issue()` if needed).
- `JiraIssue` fields: `key`, `summary`, `status`, `priority`, `issue_type`, `assignee`, `story_points`, `description`, `acceptance_criteria`, `reporter`, `created`, `parent_story_key`, `parent_story_summary`.
- ADF: JIRA API v2 returns descriptions as Atlassian Document Format JSON. `JiraClient._adf_to_text()` recursively extracts plain text from ADF nodes.
- `_parse_issue()` checks both `parent` field (JIRA hierarchy) and `issuelinks` (manual links) to find parent Story/Feature/Epic. Used by `story-coverage`.
- JQL for bug reports: SIT uses SESA ID reporters; UAT uses mixed SESA ID + display-name; Prod uses display-name. Reporter lists and start dates are class-level constants in `BugReportGenerator`. Priority sort: Blocker > Critical > High > Medium > Low.

### Templates

- `BugReportGenerator` supports `--style default` (SE green card layout) and `--style hacker` (dark terminal aesthetic).
- To add a style: create `src/templates/bug_report_{name}.html.j2` and add name to `BugReportGenerator._STYLES`.
- CSS variables are driven by `branding.*` in `config.yaml` — restyle by editing config only.
- `autoescape=True`: do not use HTML entities like `&nbsp;` in Jinja2 expressions — they get double-escaped. Use plain text.
- Status badge colors: Red = "failed", Yellow = open/new/assigned, Purple = in-progress/review, Grey = pending/on-hold, Green = everything else.

### Output

- Filename patterns controlled by `config.yaml` under `output.*_filename_pattern`.
- Unsafe characters replaced by `file_utils.sanitize_filename()`.
- Bug reports, email summaries, story coverage → `output/bug_reports/`.

### Testing Guidelines

- Mock all external API calls (JIRA, Confluence, Figma, Anthropic) — never hit live services in tests.
- Follow PEP 8 and use type hints in test code.
- Test ADF-to-text conversion for JIRA descriptions (`JiraClient._adf_to_text()`).
- Test config loading with missing/invalid `.env` and `config.yaml`.

---

## `packages/pw-autotest/` — PW-MCP AutoTest (TypeScript)

AI-assisted Playwright test automation framework with Allure 3 reporting and Claude MCP integration.

- **Language**: TypeScript (strict mode), Node.js 20+
- **Test Framework**: Playwright Test (`@playwright/test`)
- **AI Agent**: Claude Code with Playwright MCP Server
- **Reporting**: Allure 3 (`allure-playwright`) + Playwright HTML Report

### Project Purpose & Workflow

Two-phase framework:

1. **Phase 1 — AI Exploration**: QA engineer writes human-readable specs in markdown. Claude, connected via Playwright MCP, reads the specs, opens a real browser, executes each step, observes the DOM, and generates robust Playwright TypeScript tests.
2. **Phase 2 — Execution**: Generated tests run via `npx playwright test` with Allure 3 reporting, trace capture, screenshots on failure, and CI-ready outputs.

### Commands & Setup

```bash
# From packages/pw-autotest/
npm test                          # Run all tests
npm run test:chromium             # Chromium only
npm run test:smoke                # Smoke tests (@smoke tag)
npm run test:headed               # Headed browser
npm run test:debug                # Debug mode
TEST_ENV=qa npm test              # Target environment (dev/qa/ppr)
npm run report:allure             # Generate Allure report
```

```bash
cd packages/pw-autotest
npm ci
npx playwright install --with-deps
```

### Project Structure

```
packages/pw-autotest/
├── tests/                               # Generated & maintained Playwright tests
│   ├── auth/, navigation/, products/
│   └── seed.spec.ts
├── src/
│   ├── locators/                        # Element selectors only (factory functions)
│   ├── pages/                           # Page Object Models
│   ├── components/                      # Reusable UI components (OSDropdown, Modal)
│   ├── fixtures/                        # Page object initialization, auth state
│   ├── helpers/                         # api.helper.ts, data.helper.ts, wait.helper.ts
│   ├── types/                           # env.d.ts, test-data.types.ts, pages.types.ts
│   └── reporters/
├── config/
│   ├── playwright.config.ts             # Playwright configuration
│   ├── allure.config.ts                 # Allure reporting configuration
│   ├── .eslintrc.json                   # ESLint rules
│   ├── .prettierrc                      # Prettier formatting
│   ├── environments/                    # Per-environment base URLs
│   ├── users/                           # Credentials per env (gitignored)
│   └── playwright-mcp.config.json       # MCP browser settings
└── tsconfig.json
```

### Agent Prompt — Test Generation Mode

All test generation rules are in `.claude/skills/create-automation-scripts/SKILL.md`.

- **In conversation**: invoke the `/create-automation-scripts` skill
- **Subagent**: the `automation-tester` agent reads SKILL.md as its first step

### Agent Prompt — Test Healing Mode

```
You are a Playwright test healer. A test has failed.
1. Read the failing test file and error message
2. Open the target URL in browser via Playwright MCP
3. Take a snapshot to get current DOM state
4. Identify what changed (locators, flow, content)
5. Update the test with correct locators/flow
6. Update the Page Object Model if locators changed
7. Verify the fix by running the test

RULES: Prefer updating POM locators over test code.
Add a comment: // Healed: [date] - [what changed]
```

### Playwright Configuration (playwright.config.ts)

```typescript
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

const env = process.env.TEST_ENV || 'dev';
dotenv.config({ path: path.resolve(__dirname, `config/.env.${env}`) });

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: './allure-results', detail: true, suiteTitle: true }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    testIdAttribute: 'data-testid',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] }, dependencies: ['setup'] },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] }, dependencies: ['setup'] },
    { name: 'smoke', grep: /@smoke/, use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
  ],
});
```

### Allure 3 Configuration (allure.config.ts)

```typescript
import { defineConfig } from 'allure';

export default defineConfig({
  name: 'PW-MCP AutoTest Report',
  output: './allure-report',
  historyPath: './allure-report/history.jsonl',
  plugins: {
    awesome: { options: { reportName: 'PW-MCP AutoTest', singleFile: false, reportLanguage: 'en' } },
    dashboard: { options: { layout: [{ type: 'trend', dataType: 'status', mode: 'percent' }, { type: 'pie', title: 'Test Results' }] } },
    log: { options: {} },
    progress: { options: {} },
  },
});
```

### Fixtures Template

```typescript
// src/fixtures/base.fixture.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/login.page';
import { DashboardPage } from '@pages/dashboard.page';

type Pages = { loginPage: LoginPage; dashboardPage: DashboardPage };

export const test = base.extend<Pages>({
  loginPage:     async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
});

export { expect } from '@playwright/test';
```

### Page Object Model Template

```typescript
// src/pages/base.page.ts
import { type Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForOSLoad(): Promise<void> {
    await this.page.locator('.OSLoadingSpinner')
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => {}); // spinner may not appear on fast connections
  }
}
```

### package.json Scripts

```json
{
  "scripts": {
    "test": "npx playwright test",
    "test:chromium": "npx playwright test --project=chromium",
    "test:smoke": "npx playwright test --project=smoke",
    "test:headed": "npx playwright test --headed",
    "test:debug": "npx playwright test --debug",
    "report:html": "npx playwright show-report playwright-report",
    "report:allure": "npx allure generate allure-results -o allure-report --clean && npx allure open allure-report",
    "clean": "rm -rf test-results allure-results allure-report playwright-report traces",
    "lint": "eslint 'src/**/*.ts' 'tests/**/*.ts'",
    "typecheck": "tsc --noEmit"
  }
}
```

### Dependencies

```bash
npm install -D typescript @playwright/test @types/node
npx playwright install --with-deps
npm install -D allure-playwright allure-js-commons allure@latest
npm install -D dotenv @faker-js/faker
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
npm install -D @playwright/mcp@latest
```

### Playwright MCP Server Config (config/playwright-mcp.config.json)

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": { "headless": false, "channel": "chrome" },
    "contextOptions": { "viewport": { "width": 1280, "height": 720 } }
  },
  "capabilities": ["core", "pdf", "vision"],
  "saveTrace": true,
  "saveSession": true,
  "outputDir": "./traces"
}
```

MCP server is configured in the root `.claude/settings.json` — see **MCP Configuration** section.

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["src/pages/*"],
      "@fixtures/*": ["src/fixtures/*"],
      "@helpers/*": ["src/helpers/*"],
      "@locators/*": ["src/locators/*"]
    }
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "playwright.config.ts"],
  "exclude": ["node_modules", "dist", "test-results", "allure-results"]
}
```

### Best Practices Checklist

- [x] Semantic locators only (getByRole, getByLabel, getByTestId)
- [x] Auto-retrying web-first assertions — no hardcoded waits
- [x] Page Object Model for all pages, fixtures inject them
- [x] Four-layer architecture: locators → pages → fixtures → tests
- [x] Environment-based configuration via `config/.env.*`
- [x] Allure 3 + Playwright HTML dual reporting
- [x] Traces, screenshots, video on failure
- [x] TypeScript strict mode, ESLint + Prettier
- [x] Test independence — no shared mutable state between tests
- [x] Tag-based test filtering (@smoke, @regression)
- [x] No `selectOption()` — OutSystems custom dropdowns only (click → click)
- [x] No inline timeouts — use `waitFor()` on readiness signals
- [x] `waitForOSScreenLoad()` after navigation / data-triggering actions

---

## Shared Directories

- **`input/`** — Input files for docs-generator (transcripts, spec files)
- **`output/`** — Generated artifacts (release notes, meeting notes, test cases, bug reports)

Both directories are referenced from `packages/docs-generator/config.yaml` via relative paths (`../../input/`, `../../output/`).

---

## MCP Configuration

Root `.claude/settings.json` configures three MCP servers:

- **`atlassian`** — Jira + Confluence (via `uvx mcp-atlassian --env-file .env`). Provides `jira_*` and `confluence_*` tools. Credentials in `.env` (not committed).
- **`playwright`** — Browser automation for test generation. Used by `create-automation-scripts` skill.
- **`sequential-thinking`** — Extended reasoning server.

**Skills use MCP for all Jira/Confluence data fetching.** Python CLI is used only for HTML/PPTX rendering.

| Task | Tool |
| --- | --- |
| Fetch Jira issues, versions, stories | MCP `jira_*` tools |
| Fetch Confluence pages, attachments | MCP `confluence_*` tools |
| Render HTML / PPTX output | Python CLI |

**Rule for new skills:** Any new skill that needs Jira or Confluence data **must** use MCP tools directly. Do not add new `--fetch-only` Python commands.

---

## CI/CD

- `.github/workflows/playwright.yml` — Playwright tests (triggered by pw-autotest changes)
- `.github/workflows/docs.yml` — Python lint & validation (triggered by docs-generator changes)
- `.github/workflows/claude.yml` — Claude GitHub Action (@claude mentions)
- `.github/workflows/claude-code-review.yml` — Automated PR code review

---

## Coding Standards

All code generated in this project MUST follow the conventions defined in these files.
Read them before writing any TypeScript or test code.

**TypeScript Conventions** → `.claude/conventions/typescript-conventions.md`
Covers: naming, class structure, type safety, imports, async/await, error handling.

**Testing Patterns** → `.claude/conventions/testing-patterns.md`
Covers: four-layer architecture, locators, page objects, components (OSDropdown, Modal), fixtures, test structure, assertions, wait strategies, OutSystems-specific rules.

Rules summary:
- Locators → `src/locators/*.locators.ts` only, factory function pattern
- Page Objects → actions + assertions only, no inline locators
- Components → for any UI pattern used in 2+ pages
- Fixtures → page object initialization, never inside test files
- Tests → business logic only, no `expect()`, no `page.locator()` calls
- Never use `waitForTimeout()`, `selectOption()`, XPath, or CSS class selectors
