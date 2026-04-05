# PICASso Automation

Playwright + TypeScript E2E test automation suite for the **PICASso** OutSystems application.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install --with-deps

# 3. Create your environment file
cp .env.example .env
# Edit .env with your target environment settings

# 4. Add user credentials
# Create config/users/qa.users.ts (see config/users/user.types.ts for the shape)

# 5. Run tests
npm test                        # all projects
npm run test:chromium           # chromium only
npm run test:smoke              # smoke suite
```

## Project Structure

```
├── src/
│   ├── fixtures/               # Playwright test fixtures (extended test object)
│   ├── helpers/                # Utility helpers (wait, data, doc, API)
│   ├── locators/               # Locator factory functions per feature area
│   ├── pages/                  # Page Object Models (extend BasePage)
│   ├── reporters/              # Custom Playwright reporters
│   └── types/                  # TypeScript type definitions
├── tests/
│   ├── auth/                   # Authentication tests
│   ├── doc/                    # DOC lifecycle, details, history, actions, risk, certification
│   ├── landing/                # Landing page and My DOCs tab
│   ├── products/               # Product CRUD, details, history, releases
│   └── releases/               # Release management
├── config/
│   ├── environments/           # Environment configs (qa, dev, ppr)
│   └── users/                  # User credential files (gitignored)
├── specs/                      # Human-readable test specifications (Markdown)
├── docs/ai/                    # Automation testing plans, coverage matrices, app maps
├── .github/
│   ├── instructions/           # Copilot coding instructions
│   ├── prompts/                # Copilot prompt templates
│   └── workflows/              # CI — Playwright on GitHub Actions
├── playwright.config.ts        # Playwright configuration (15+ projects)
├── tsconfig.json               # TypeScript config with path aliases
└── package.json
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all Playwright tests |
| `npm run test:chromium` | Run chromium project only |
| `npm run test:smoke` | Run smoke-tagged tests |
| `npm run test:headed` | Run tests in headed mode |
| `npm run test:debug` | Run tests with Playwright Inspector |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run report:html` | Open HTML report |
| `npm run report:allure` | Generate and open Allure report |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier formatting |

## Test Projects (Playwright Config)

The Playwright config defines **15+ projects** with dependency chains for the DOC lifecycle:

```
setup → doc-product-setup → doc-initiation → doc-state-setup → doc-detail-*
```

Standalone projects: `chromium`, `smoke`, `doc-detail-actions`, `doc-lifecycle`, etc.

## Environment Configuration

| Environment | Config File |
|-------------|-------------|
| QA | `config/environments/qa.ts` |
| Dev | `config/environments/dev.ts` |
| PPR | `config/environments/ppr.ts` |

Set `TEST_ENV=qa` (or `dev`/`ppr`) in `.env` or as an environment variable.

## Documentation

- [Automation Testing Plan](docs/ai/automation-testing-plan.html) — interactive test plan with coverage status
- [Coverage Matrix](docs/ai/current-automation-coverage-matrix.md) — current automation coverage
- [Application Map](docs/ai/application-map.html) — PICASso application structure
- [Pipeline](docs/ai/pipeline.md) — automation pipeline description

## CI/CD

GitHub Actions workflow (`.github/workflows/playwright.yml`) runs on:
- Push/PR to `main` or `develop` branches
- Manual dispatch with environment, role, and test filter selection
