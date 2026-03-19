# CLAUDE.md — PICASso Platform

Monorepo containing two packages for the PICASso QA & documentation platform.

## Packages

### `packages/docs-generator/` — SE-DevTools (Python)

Python Click CLI for automated documentation generation with Jira, Confluence, Figma, and Claude AI integrations.

**Commands** (run from `packages/docs-generator/`):
```bash
python main.py release-notes --version "2.4.1" [--project PROJ] [--publish]
python main.py full-release-notes --version "2.4.1" [--project PROJ] [--publish]
python main.py meeting-notes --file "standup.txt" | --all
python main.py test-cases --story PROJ-452 [--story PROJ-453 ...]
python main.py pptx-release-notes --spec "spec.json"
python main.py bug-report [--style hacker]
python main.py email-summary
python main.py story-coverage
```

**Setup:**
```bash
cd packages/docs-generator
pip install -r requirements.txt
cp .env.example .env  # fill in JIRA_*, CONFLUENCE_*, FIGMA_API_TOKEN, ANTHROPIC_API_KEY
```

**Architecture:** clients → generators → Jinja2 templates. Config: `.env` (secrets) + `config.yaml` (settings). See `packages/docs-generator/CLAUDE.md` for full details.

---

### `packages/pw-autotest/` — PW-MCP AutoTest (TypeScript)

AI-assisted Playwright test automation framework with Allure 3 reporting and Claude MCP integration.

**Commands** (run from `packages/pw-autotest/`):
```bash
npm test                          # Run all tests
npm run test:chromium             # Chromium only
npm run test:smoke                # Smoke tests (@smoke tag)
npm run test:headed               # Headed browser
npm run test:debug                # Debug mode
TEST_ENV=qa npm test              # Target environment (dev/qa/ppr)
npm run report:allure             # Generate Allure report
```

**Setup:**
```bash
cd packages/pw-autotest
npm ci
npx playwright install --with-deps
```

**Architecture:** Specs (markdown) → Claude CLI + Playwright MCP → Generated tests + POMs. See `packages/pw-autotest/CLAUDE.md` for full details.

---

## Shared Directories

- **`input/`** — Input files for docs-generator (transcripts, spec files)
- **`output/`** — Generated artifacts from docs-generator (release notes, meeting notes, test cases, bug reports)

Both directories are referenced from `packages/docs-generator/config.yaml` via relative paths (`../../input/`, `../../output/`).

## MCP Configuration

Root `.claude/settings.json` provides Playwright MCP and sequential-thinking servers. The `packages/pw-autotest/.claude/settings.json` has the same config for package-level use.

## CI/CD

- `.github/workflows/playwright.yml` — Playwright tests (triggered by pw-autotest changes)
- `.github/workflows/docs.yml` — Python lint & validation (triggered by docs-generator changes)
- `.github/workflows/claude.yml` — Claude GitHub Action (@claude mentions)
- `.github/workflows/claude-code-review.yml` — Automated PR code review

## Coding Standards

All code generated in this project MUST follow the conventions defined in these files.
Read them before writing any TypeScript or test code.

### TypeScript Conventions
→ `.claude/conventions/typescript-conventions.md`
Covers: naming, class structure, type safety, imports, async/await, error handling.

### Testing Patterns
→ `.claude/conventions/testing-patterns.md`
Covers: four-layer architecture, locators, page objects, components (OSDropdown, Modal),
fixtures, test structure, assertions, wait strategies, OutSystems-specific rules.

### Rules Summary
- Locators → `src/locators/*.locators.ts` only, factory function pattern
- Page Objects → actions + assertions only, no inline locators
- Components → for any UI pattern used in 2+ pages
- Fixtures → page object initialization, never inside test files
- Tests → business logic only, no `expect()`, no `page.locator()` calls
- Never use `waitForTimeout()`, `selectOption()`, XPath, or CSS class selectors
