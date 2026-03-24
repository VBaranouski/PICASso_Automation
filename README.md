# PICASso Platform

Monorepo for the PICASso QA & documentation platform, combining automated documentation generation with AI-assisted test automation.

## Packages

| Package | Language | Purpose |
| ------- | -------- | ------- |
| [`projects/docs-generator`](projects/docs-generator/) | Python 3.11+ | CLI for generating release notes, meeting notes, test cases, bug reports from Jira/Confluence/Figma |
| [`projects/pw-autotest`](projects/pw-autotest/) | TypeScript | AI-assisted Playwright test automation with Allure 3 reporting |

## Prerequisites

| Tool | Minimum Version |
| ---- | --------------- |
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

## Quick Start

### Docs Generator (Python)

```bash
cd projects/docs-generator
pip install -r requirements.txt
cp ../../.env.example ../../.env   # Edit .env with your Jira, Confluence, Figma API keys
python main.py --help
```

> **API Keys required:** `JIRA_*`, `CONFLUENCE_*`, and optionally `FIGMA_API_TOKEN`. See [`.env.example`](.env.example) for all variables and descriptions.

### PW AutoTest (TypeScript)

```bash
cd projects/pw-autotest
npm ci
npx playwright install --with-deps
npm test           # Runs all tests + generates Allure report
```

#### Additional test commands

| Command | Description |
| ------- | ----------- |
| `npm run test:chromium` | Chromium only |
| `npm run test:firefox` | Firefox only |
| `npm run test:webkit` | WebKit only |
| `npm run test:mobile` | Mobile Chrome + Safari |
| `npm run test:smoke` | Smoke suite |
| `npm run test:headed` | Headed mode |
| `npm run test:debug` | Debug mode |
| `npm run test:ui` | Playwright UI mode |
| `npm run report:allure` | Re-generate & open Allure report |
| `npm run lint` | Lint TypeScript sources |
| `npm run typecheck` | Type-check without emitting |
| `npm run clean` | Remove all test artefacts |

## Repository Structure

```text
PICASso/
├── projects/
│   ├── docs-generator/    # Python CLI — SE-DevTools
│   └── pw-autotest/       # TypeScript — Playwright + Allure + Claude MCP
├── input/                 # Shared input (transcripts, spec files)
├── output/                # Shared output (generated docs & reports)
├── .claude/               # Root MCP config
├── .github/
│   ├── workflows/         # CI pipelines
│   ├── prompts/           # GitHub Copilot prompt files
│   └── copilot-instructions.md
├── .env.example           # Environment variable template
├── CLAUDE.md              # AI agent instructions
└── README.md              # This file
```

## Shared I/O

The `input/` and `output/` directories at the repo root are used by `docs-generator` for reading transcripts and writing generated artifacts. Path configuration is in `projects/docs-generator/config.yaml`.

## CI/CD

| Workflow | Trigger | Purpose |
| -------- | ------- | ------- |
| `playwright.yml` | Changes in `projects/pw-autotest/` | Run Playwright tests |
| `docs.yml` | Changes in `projects/docs-generator/` | Validate Python CLI |
| `claude.yml` | `@claude` mentions in issues/PRs | Claude GitHub Action |
| `claude-code-review.yml` | PR opened/updated | Automated code review |

## Contributing

1. Fork the repository and create a feature branch
2. Follow the coding conventions enforced by ESLint / Prettier (pw-autotest) or PEP 8 (docs-generator)
3. Ensure all tests pass before opening a PR — PRs trigger automated Playwright runs and Claude code review
4. Reference relevant Jira tickets in your PR description
