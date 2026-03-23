# CLAUDE.md — PICASso

Platform for test automation and project documentation generation for Schneider Electric.

---

## Tech Stack

- **docs-generator**: Python 3.11+, Click, Jinja2, python-pptx, requests
- **pw-autotest**: TypeScript, Playwright, Allure 3, Node.js
- **Integrations**: Jira Server/DC (API v2), Confluence Server/DC, Figma Cloud
- **AI tooling**: Claude Code skills + MCP servers (atlassian, figma, playwright, sequential-thinking)

---

## Projects

Each project's detailed description lives in a separate file — read it when working on that project.

- **`docs-generator`** — Python CLI for producing project documentation: release notes, meeting notes, test cases, bug reports. → `.claude/rules/docs-generator.md`
- **`pw-autotest`** — TypeScript framework for AI-assisted Playwright automation testing with Allure 3 reporting. → `.claude/rules/pw-autotest.md`

Shared directories:

- **`input/`** — Input files for docs-generator (transcripts, spec files)
- **`output/`** — Generated artifacts (release notes, meeting notes, test cases, bug reports)

---

## MCP Configuration

Root `.claude/settings.json` configures four MCP servers:

- **`atlassian`** — Jira + Confluence. Provides `jira_*` and `confluence_*` tools.
- **`figma`** — Figma design access. Provides `figma_*` tools.
- **`playwright`** — Browser automation for test generation.
- **`sequential-thinking`** — Extended reasoning server.

| Task | Tool |
| --- | --- |
| Fetch Jira issues, versions, stories | MCP `jira_*` tools |
| Fetch Confluence pages, attachments | MCP `confluence_*` tools |
| Fetch Figma designs, variables, screenshots | MCP `figma_*` tools |
| Render HTML / PPTX output | Python CLI |

---

## Critical Rules

**Never do:**

- Never use Python to fetch Jira/Confluence data — always use MCP tools directly
- Never add new Python fetch commands for data that MCP can provide
- Never use `waitForTimeout()`, `selectOption()`, XPath, or CSS class selectors in tests
- Never put `expect()` or `page.locator()` calls inside test files
- Never commit `.env` files or credentials
- Never use `python` — always `python3` on this machine

**Always do:**

- Read the project's rules file before working on it (`.claude/rules/docs-generator.md` or `.claude/rules/pw-autotest.md`)
- Follow TypeScript conventions → `.claude/rules/typescript-conventions.md`
- Follow testing patterns → `.claude/rules/testing-patterns.md`

---

## Workflow

- **MCP-first**: fetch all Jira, Confluence, and Figma data via MCP tools; invoke Python only for rendering
- **Skills**: use `/create-*` skills for all documentation and test generation tasks
- **Agents**: `automation-tester`, `business-analyst` agents have their own memory in `.claude/agents/`
