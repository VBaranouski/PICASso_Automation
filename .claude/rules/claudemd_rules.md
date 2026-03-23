# High-ROI Things to Include in CLAUDE.md

Elements most frequently cited as delivering strong returns in real projects, prioritized by impact.

---

## 1. Project Overview & Purpose

One-paragraph summary: who the project is for, core goals, key constraints.

> Example: "Static-export Next.js app for marketing site — no server runtime in production."

---

## 2. Tech Stack & Versions

Explicit list: languages, frameworks, key libraries, and versions. Prevents outdated assumptions.

> Example: "Python 3.12 + FastAPI 0.115, Pydantic v2, PostgreSQL 16 via SQLAlchemy 2.x"

---

## 3. Architecture & High-Level Structure

Big-picture map: layered architecture, main modules/folders, data flow, critical invariants.

> Example: "API responses always wrapped in `{data: [], meta: {pagination…}}` — never flat arrays."

---

## 4. Coding Conventions & Style Rules

Specific, enforceable preferences. High-ROI because they prevent drift in long sessions.

- "Always use `const`/`let` — never `var`"
- "Prefer functional patterns over classes when possible"
- "Type hints on every function signature"
- "Structlog for logging, never `print()`"

---

## 5. Key Commands & Workflows

Build/test/deploy/lint/run commands. Include one-off test runs or common dev tasks.

> Examples: `npm run dev`, `pytest --lf`, `docker compose up --build`

---

## 6. Important "Never Do" Rules & Gotchas

The biggest time-savers:

- "Never commit secrets or `.env` values"
- "Don't use Mocha — all tests must be Jest"
- "No inline scripts in production builds"
- "Accessibility: every image needs `alt` text, ARIA roles on interactive elements"
- Project-specific pitfalls (e.g., "Our auth middleware requires JWT in `Authorization` header — never cookies")

---

## 7. UI / Design / Accessibility Constraints *(frontend only)*

Design system refs, color tokens, responsive rules, a11y must-haves.

---

## 8. Testing & Quality Gates

- "Write unit tests for all new utilities"
- "Aim for >85% coverage on critical paths"
- "Use TDD when adding features unless instructed otherwise"

---

## 9. Workflow Preferences

- "Always plan first in `<plan>` tags before writing code"
- "Ask clarifying questions before large refactors"
- "Prefer small, reviewable changes"

---

## 10. References & Imports (Progressive Disclosure)

Link to deeper docs instead of dumping everything in root `CLAUDE.md`:

```md
@./docs/architecture.md
@./skills/api-patterns.md
```

---

## Structure Tips for Maximum ROI

```md
# CLAUDE.md – Project Guidance for Claude Code

## Project Overview
[short paragraph]

## Tech Stack
- Backend: ...
- Frontend: ...

## Architecture
- Monorepo structure: /apps/web, /packages/ui, /services/api

## Coding Standards
- ...

## Critical Rules
- Never: ...
- Always: ...

## Common Commands
- dev: npm run dev
- test: npm test -- --watch

## Imports
@./CLAUDE.rules.md  # permanent rules in a separate file
```

**Key principles:**

- Keep root `CLAUDE.md` lean — move stable/permanent rules to `.claude/rules/*.md`
- Review & prune regularly — remove redundancy as the project evolves
- Avoid generic fluff ("be helpful", "write good code") — Claude's base prompt already covers that
- Human oversight wins — `/init` is great for starters, but manual refinement yields better long-term results

> This setup compounds: the more specific and battle-tested your `CLAUDE.md` becomes, the less you intervene — leading to faster, higher-quality sessions. If your project has a particular domain (web3, fintech, ML), tailor the gotchas/rules heavily to those — that's where the ROI spikes most.
