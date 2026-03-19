# CLAUDE.md — AI-Powered Playwright MCP Test Automation Framework

## Project Identity

- **Name**: `pw-mcp-autotest`
- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js 20+
- **Test Framework**: Playwright Test (`@playwright/test`)
- **AI Agent**: Claude CLI (Claude Code) with Playwright MCP Server
- **Reporting**: Allure 3 (`allure-playwright`) + Playwright HTML Report
- **Package Manager**: npm

---

## Project Purpose & Workflow

This is a **two-phase AI-assisted test automation framework**:

1. **Phase 1 — AI Exploration**: The QA engineer writes human-readable test cases (specs) in markdown. Claude CLI agent, connected via Playwright MCP, reads the specs, opens a real browser, executes each step interactively, observes the DOM, and generates robust Playwright TypeScript test scripts.

2. **Phase 2 — Execution**: Generated tests run from the terminal using `npx playwright test` with full Allure 3 reporting, trace capture, screenshots on failure, and CI-ready outputs.

---

## Project Structure

```
pw-mcp-autotest/
│
├── .github/
│   ├── copilot-instructions.md          # Agent instructions for GitHub Copilot
│   └── workflows/
│       └── playwright.yml               # CI pipeline (GitHub Actions)
│
├── .claude/
│   ├── skills/
│   │   └── playwright-cli/
│   │       └── SKILL.md                 # Playwright CLI skill for Claude Code
│   └── settings.json                    # Claude Code MCP server config
│
├── specs/                               # Human-readable test specifications
│   ├── README.md                        # How to write specs
│   ├── auth/
│   │   ├── login.md                     # Login flow spec
│   │   └── logout.md                    # Logout flow spec
│   ├── navigation/
│   │   └── main-menu.md                 # Navigation spec
│   └── _template.md                     # Spec template
│
├── tests/                               # Generated & maintained Playwright tests
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── navigation/
│   │   └── main-menu.spec.ts
│   └── seed.spec.ts                     # Seed test for environment validation
│
├── src/
│   ├── pages/                           # Page Object Models (POM)
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   └── index.ts                     # Barrel export
│   │
│   ├── fixtures/                        # Custom Playwright fixtures
│   │   ├── base.fixture.ts              # Extended test with custom fixtures
│   │   ├── auth.fixture.ts              # Authentication fixture
│   │   └── index.ts                     # Barrel export
│   │
│   ├── helpers/                         # Utility functions
│   │   ├── api.helper.ts                # API helper for test data setup
│   │   ├── data.helper.ts               # Test data generators (faker)
│   │   └── wait.helper.ts               # Custom wait strategies
│   │
│   ├── types/                           # TypeScript interfaces & types
│   │   ├── env.d.ts                     # Environment variable types
│   │   ├── test-data.types.ts           # Test data interfaces
│   │   └── pages.types.ts               # Page object interfaces
│   │
│   └── reporters/                       # Custom reporters (if needed)
│       └── custom-reporter.ts
│
├── config/                              # Environment configurations
│   ├── .env.dev                         # Dev environment
│   ├── .env.staging                     # Staging environment
│   ├── .env.prod                        # Production (read-only tests)
│   └── playwright-mcp.config.json       # Playwright MCP server config
│
├── test-results/                        # Raw test results (gitignored)
├── allure-results/                      # Allure raw data (gitignored)
├── allure-report/                       # Generated Allure report (gitignored)
├── playwright-report/                   # Playwright HTML report (gitignored)
├── traces/                              # Playwright traces (gitignored)
├── storage/                             # Auth state files (gitignored)
│   └── auth.json
│
├── playwright.config.ts                 # Main Playwright configuration
├── allure.config.ts                     # Allure 3 report configuration
├── tsconfig.json                        # TypeScript configuration
├── package.json
├── .gitignore
├── .eslintrc.json                       # ESLint config
├── .prettierrc                          # Prettier config
├── CLAUDE.md                            # This file — agent instructions
└── README.md                            # Project documentation
```

---

## Spec Format (specs/_template.md)

Each spec is a human-readable test plan that Claude CLI agent converts into Playwright tests:

```markdown
# Spec: [Feature Name]

## Meta
- **Priority**: P0 | P1 | P2
- **Tags**: @smoke, @regression, @auth
- **Preconditions**: User is logged in / Guest user / etc.
- **Target URL**: https://staging.example.com/login
- **Target Page Object**: LoginPage

## Scenario: [Scenario Name]

### Steps
1. Navigate to {Target URL}
2. Fill "Email" field with "user@example.com"
3. Fill "Password" field with "SecurePass123"
4. Click "Sign In" button
5. Wait for dashboard page to load

### Expected Results
- URL contains "/dashboard"
- Welcome message "Hello, User" is visible
- Navigation sidebar is visible with menu items

### Test Data
| Field    | Value              |
|----------|--------------------|
| Email    | user@example.com   |
| Password | SecurePass123      |

### Notes
- Test should work with auto-retry assertions
- Use role-based locators (getByRole, getByLabel)
- NO CSS selectors or XPath — only semantic locators
```

---

## Agent Prompt — Test Generation Mode

All test generation rules, locator strategies, OutSystems patterns, verification and waiting strategies, and the pre-submission checklist are defined in a single source of truth:

**`.claude/skills/playwright-test-generator/SKILL.md`**

This file covers: imports, test structure template, POM template, locator strategy (with decision flowchart), OutSystems-specific widget patterns (dropdowns, date pickers, toggles, popups, loading indicators), verification DO/DON'T tables, waiting & timeout strategy with reusable helpers, Allure metadata requirements, common mistakes table, and the quick checklist.

- **In main conversation**: invoke the `/playwright-test-generator` skill to load these rules
- **Subagent**: the `playwright-test-generator` agent reads SKILL.md as its first workflow step

---

## Agent Prompt — Test Healing Mode

When a test fails, Claude CLI agent can auto-heal it:

```
You are a Playwright test healer. A test has failed.

WORKFLOW:
1. Read the failing test file and error message
2. Open the target URL in browser via Playwright MCP
3. Take a snapshot to get current DOM state
4. Identify what changed (locators, flow, content)
5. Update the test with correct locators/flow
6. Update the Page Object Model if locators changed
7. Verify the fix by running the test

RULES:
- Prefer updating POM locators over test code
- If the UI flow changed, update both POM and spec
- Add a comment: // Healed: [date] - [what changed]
- Do NOT change assertion logic unless the expected behavior changed
```

---

## Playwright Configuration (playwright.config.ts)

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
    ['allure-playwright', {
      resultsDir: './allure-results',
      detail: true,
      suiteTitle: true,
    }],
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
    // --- Setup ---
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // --- Desktop Browsers ---
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },

    // --- Mobile ---
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },

    // --- Smoke (fast feedback) ---
    {
      name: 'smoke',
      grep: /@smoke/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
```

---

## Allure 3 Configuration (allure.config.ts)

```typescript
import { defineConfig } from 'allure';

export default defineConfig({
  name: 'PW-MCP AutoTest Report',
  output: './allure-report',
  historyPath: './allure-report/history.jsonl',
  plugins: {
    awesome: {
      options: {
        reportName: 'PW-MCP AutoTest',
        singleFile: false,
        reportLanguage: 'en',
      },
    },
    dashboard: {
      options: {
        layout: [
          { type: 'trend', dataType: 'status', mode: 'percent' },
          { type: 'pie', title: 'Test Results' },
        ],
      },
    },
    log: { options: {} },
    progress: { options: {} },
  },
});
```

---

## Custom Fixtures (src/fixtures/base.fixture.ts)

```typescript
import { test as base, expect } from '@playwright/test';

type CustomFixtures = {
  authenticatedPage: import('@playwright/test').Page;
};

type CustomWorkerFixtures = {
  workerStorageState: string;
};

export const test = base.extend<CustomFixtures, CustomWorkerFixtures>({

  // Storage state per worker — auth setup once
  workerStorageState: [async ({ browser }, use, workerInfo) => {
    const id = workerInfo.workerIndex;
    const fileName = `storage/auth-worker-${id}.json`;

    // TODO: implement auth setup if needed
    // const page = await browser.newPage();
    // ... login flow ...
    // await page.context().storageState({ path: fileName });
    // await page.close();

    await use(fileName);
  }, { scope: 'worker' }],

  // Authenticated page fixture
  authenticatedPage: async ({ browser, workerStorageState }, use) => {
    const context = await browser.newContext({
      storageState: workerStorageState,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

---

## Page Object Model Template (src/pages/BasePage.ts)

```typescript
import { type Page, type Locator } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly url: string;

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }
}
```

---

## package.json Scripts

```json
{
  "scripts": {
    "test": "npx playwright test",
    "test:chromium": "npx playwright test --project=chromium",
    "test:firefox": "npx playwright test --project=firefox",
    "test:webkit": "npx playwright test --project=webkit",
    "test:mobile": "npx playwright test --project=mobile-chrome --project=mobile-safari",
    "test:smoke": "npx playwright test --project=smoke",
    "test:headed": "npx playwright test --headed",
    "test:debug": "npx playwright test --debug",
    "test:ui": "npx playwright test --ui",
    "test:grep": "npx playwright test --grep",

    "report:html": "npx playwright show-report playwright-report",
    "report:allure": "npx allure generate allure-results -o allure-report --clean && npx allure open allure-report",
    "report:allure:generate": "npx allure generate allure-results -o allure-report --clean",
    "report:allure:open": "npx allure open allure-report",

    "clean": "rm -rf test-results allure-results allure-report playwright-report traces",
    "lint": "eslint 'src/**/*.ts' 'tests/**/*.ts'",
    "lint:fix": "eslint 'src/**/*.ts' 'tests/**/*.ts' --fix",
    "format": "prettier --write 'src/**/*.ts' 'tests/**/*.ts'",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Dependencies to Install

```bash
# Core
npm init -y
npm install -D typescript @playwright/test @types/node

# Playwright browsers
npx playwright install --with-deps

# Allure reporting
npm install -D allure-playwright allure-js-commons
npm install -D allure@latest  # Allure 3 CLI

# Environment & utilities
npm install -D dotenv @faker-js/faker

# Code quality
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier eslint-plugin-playwright

# Playwright MCP (for Claude CLI integration)
npm install -D @playwright/mcp@latest

# Playwright CLI (for agent skill)
npm install -g @playwright/cli@latest
playwright-cli install --skills
```

---

## Playwright MCP Configuration (.claude/settings.json)

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--config",
        "./config/playwright-mcp.config.json"
      ]
    }
  }
}
```

## Playwright MCP Server Config (config/playwright-mcp.config.json)

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "headless": false,
      "channel": "chrome"
    },
    "contextOptions": {
      "viewport": { "width": 1280, "height": 720 }
    }
  },
  "capabilities": ["core", "pdf", "vision"],
  "saveTrace": true,
  "saveSession": true,
  "outputDir": "./traces",
  "network": {
    "blockedOrigins": ["https://ads.example.com"]
  }
}
```

---

## Terminal Commands — Quick Reference

```bash
# Run all tests
npm test

# Run specific suite
npm run test:smoke
npm run test:chromium

# Run single test file
npx playwright test tests/auth/login.spec.ts

# Run by tag
npx playwright test --grep @smoke
npx playwright test --grep @regression

# Run headed (see browser)
npm run test:headed

# Debug mode (step through)
npm run test:debug

# UI mode (interactive)
npm run test:ui

# Run against specific env
TEST_ENV=staging npm test
TEST_ENV=prod npm run test:smoke

# Generate & view Allure report
npm run report:allure

# View Playwright HTML report
npm run report:html

# Clean all artifacts
npm run clean
```

---

## Claude CLI Agent — Quick Commands

```bash
# Add Playwright MCP to Claude Code
claude mcp add playwright npx @playwright/mcp@latest

# Install Playwright CLI skill
playwright-cli install --skills

# Ask Claude to generate tests from spec
claude "Read specs/auth/login.md and generate a Playwright test. Use MCP to open the browser, execute each step, inspect the DOM with snapshots, and write the test file to tests/auth/login.spec.ts using POM pattern."

# Ask Claude to heal a broken test
claude "The test tests/auth/login.spec.ts is failing with error: 'locator not found'. Open the app in browser via MCP, inspect what changed, and fix the test."

# Ask Claude to explore and generate spec
claude "Navigate to https://staging.example.com using Playwright MCP. Explore the main user flows, document them as specs in specs/ directory, then generate corresponding Playwright tests."
```

---

## TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@pages/*": ["src/pages/*"],
      "@fixtures/*": ["src/fixtures/*"],
      "@helpers/*": ["src/helpers/*"],
      "@types/*": ["src/types/*"]
    },
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "playwright.config.ts"],
  "exclude": ["node_modules", "dist", "test-results", "allure-results"]
}
```

---

## .gitignore

```
node_modules/
dist/
test-results/
allure-results/
allure-report/
playwright-report/
traces/
storage/
blob-report/
*.env.local
.DS_Store
```

---

## CI/CD Pipeline (.github/workflows/playwright.yml)

```yaml
name: Playwright Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        project: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps ${{ matrix.project }}

      - name: Run tests
        run: npx playwright test --project=${{ matrix.project }}
        env:
          TEST_ENV: staging
          CI: true

      - name: Upload Allure results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: allure-results-${{ matrix.project }}
          path: allure-results/
          retention-days: 30

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.project }}
          path: playwright-report/
          retention-days: 30

      - name: Upload traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: traces-${{ matrix.project }}
          path: test-results/
          retention-days: 7
```

---

## Best Practices Checklist

- [x] Semantic locators only (getByRole, getByLabel, getByTestId) — see Locator Strategy in SKILL.md
- [x] Locator text verified against real DOM (not just MCP snapshot)
- [x] Auto-retrying web-first assertions
- [x] Assertions verify user-visible outcomes only (no URL regex, CSS props, internal attributes)
- [x] OutSystems-specific patterns followed (see SKILL.md for details)
- [x] No hardcoded waits or sleeps
- [x] Page Object Model for all pages
- [x] Custom fixtures for auth and common setup
- [x] Environment-based configuration
- [x] Allure 3 + Playwright HTML dual reporting
- [x] Traces, screenshots, video on failure
- [x] Parallel execution with worker isolation
- [x] CI/CD ready with GitHub Actions
- [x] TypeScript strict mode
- [x] ESLint + Prettier for code quality
- [x] Test independence (no shared state between tests)
- [x] Tag-based test filtering (@smoke, @regression)
- [x] Multi-browser + mobile testing
- [x] Claude CLI + Playwright MCP integration for AI-assisted test generation
- [x] No `selectOption()` — OutSystems custom dropdowns only (click → click)
- [x] No inline timeouts on actions/assertions — use `waitFor()` on readiness signals
- [x] OutSystems widget patterns: OSUI dropdowns, date pickers, toggles, popups (see SKILL.md)
- [x] Reusable wait helpers: `waitForOSScreenLoad()`, `waitForPageReady()` (see `src/helpers/wait.helper.ts`)
