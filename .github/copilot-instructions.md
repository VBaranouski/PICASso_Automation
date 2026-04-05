# Repository Copilot Instructions

PICASso Automation is a dedicated Playwright + TypeScript test automation repository for the PICASso OutSystems application.

## Project structure

```
├── src/           → fixtures, page objects, locators, helpers, types
├── tests/         → Playwright spec files (auth, doc, landing, products, releases)
├── config/        → environments, users, ESLint, Prettier, Allure
├── specs/         → human-readable test specifications (Markdown)
├── docs/ai/       → automation testing plans, coverage matrices, application maps
├── .github/       → CI workflows, Copilot instructions, prompts
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

## Default workflow

1. Identify the test scenario from Jira, Confluence, or free-text input.
2. Walk the scenario in-browser with Playwright MCP before finalizing locators.
3. Generate or update Playwright TypeScript code in `src/` and `tests/`.
4. Run the targeted `npx playwright test ...` command and fix remaining issues.
5. If the failure is caused by product behavior, classify it as a likely defect.
6. Update the automation testing plans and coverage artifacts in `docs/ai/`.

## Read before generating automation assets

- `.github/instructions/pw-autotest.instructions.md`
- `.github/instructions/automation-scripts.instructions.md`
- `.github/instructions/browser-mcp.instructions.md`
- `.github/instructions/naming.instructions.md`

## Prompt entry points

- `.github/prompts/run-automation-pipeline.prompt.md`
- `.github/prompts/generate-automation-test-cases.prompt.md`
- `.github/prompts/generate-playwright-tests.prompt.md`
- `.github/prompts/validate-browser-locators.prompt.md`
- `.github/prompts/generate-tests.prompt.md`

## Core rules

- Prefer semantic locators and verify them in-browser when MCP is available.
- Never use `waitForTimeout()` or `networkidle` for the OutSystems app.
- Use web-first assertions (`expect(locator)`) instead of snapshot reads.
- For new or changed test scripts, validate the full UI path in Playwright MCP before treating the code as done.
- After MCP validation, run the smallest relevant `npx playwright test ...` command.
- Do not "fix" expectation-vs-actual product mismatches by weakening assertions; classify those as likely defects.
- Keep Markdown and HTML application plans in sync with the latest validated automation coverage.
- Keep tests isolated; avoid test-order dependencies unless explicitly implemented as a setup project.
- Do not reach into private page-object internals from tests.
- Prefer setup projects, fixtures, and persisted state files over serial test suites.
- Match the existing style of nearby tests, fixtures, locators, and page objects.
