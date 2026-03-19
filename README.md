# PICASso Platform

Monorepo for the PICASso QA & documentation platform, combining automated documentation generation with AI-assisted test automation.

## Packages

| Package | Language | Purpose |
|---------|----------|---------|
| [`packages/docs-generator`](packages/docs-generator/) | Python 3.11+ | CLI for generating release notes, meeting notes, test cases, bug reports from Jira/Confluence/Figma |
| [`packages/pw-autotest`](packages/pw-autotest/) | TypeScript | AI-assisted Playwright test automation with Allure 3 reporting |

## Quick Start

### Docs Generator (Python)

```bash
cd packages/docs-generator
pip install -r requirements.txt
cp .env.example .env   # Configure Jira, Confluence, Figma, Anthropic API keys
python main.py --help
```

### PW AutoTest (TypeScript)

```bash
cd packages/pw-autotest
npm ci
npx playwright install --with-deps
npm test
```

## Repository Structure

```
PICASso/
├── packages/
│   ├── docs-generator/    # Python CLI — SE-DevTools
│   └── pw-autotest/       # TypeScript — Playwright + Allure + Claude MCP
├── input/                 # Shared input (transcripts, spec files)
├── output/                # Shared output (generated docs & reports)
├── .claude/               # Root MCP config
├── .github/workflows/     # CI pipelines
├── CLAUDE.md              # AI agent instructions
└── README.md              # This file
```

## Shared I/O

The `input/` and `output/` directories at the repo root are used by `docs-generator` for reading transcripts and writing generated artifacts. Path configuration is in `packages/docs-generator/config.yaml`.

## CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `playwright.yml` | Changes in `packages/pw-autotest/` | Run Playwright tests |
| `docs.yml` | Changes in `packages/docs-generator/` | Validate Python CLI |
| `claude.yml` | `@claude` mentions in issues/PRs | Claude GitHub Action |
| `claude-code-review.yml` | PR opened/updated | Automated code review |
