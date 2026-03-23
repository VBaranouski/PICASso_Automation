## `projects/pw-autotest/` — PW-MCP AutoTest (TypeScript)

AI-assisted Playwright test automation framework with Allure 3 reporting and Claude MCP integration.

### Project Purpose & Workflow

Two-phase framework:

1. **Phase 1 — AI Exploration**: Claude reads specs, opens a real browser via Playwright MCP, observes the DOM, and generates Playwright TypeScript tests.
2. **Phase 2 — Execution**: Tests run via `npx playwright test` with Allure 3 + Playwright HTML dual reporting.

### Commands & Setup

```bash
# From projects/pw-autotest/
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
projects/pw-autotest/
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
