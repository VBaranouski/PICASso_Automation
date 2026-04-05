# Generate Tests

Legacy entry prompt for test generation. Prefer the split prompts for new work.

## Recommended prompt entry points

- `.github/prompts/run-automation-pipeline.prompt.md` for the full workflow
- `.github/prompts/normalize-requirements.prompt.md` for intake only
- `.github/prompts/generate-automation-test-cases.prompt.md` for automation-ready cases
- `.github/prompts/generate-playwright-tests.prompt.md` for Playwright code generation
- `.github/prompts/validate-browser-locators.prompt.md` for browser refinement only

## If you use this prompt directly

Perform the full pipeline:

1. Read the split instruction files in `.github/instructions/`.
2. Normalize the source input into `docs/ai/` as JSON + HTML.
3. Generate automation-ready test cases into `docs/ai/` as JSON + HTML.
4. Validate the flow in the browser with Playwright MCP.
5. Generate or update Playwright TypeScript code in ``.
6. Write automation manifest JSON + HTML to `docs/ai/`.

## Core rules

- Treat Jira, Confluence, and free-text stories equally after normalization.
- Keep JSON canonical and HTML review-only.
- Never rely on guessed locators when browser MCP is available.
- Never use `waitForTimeout()` or `networkidle` for the OutSystems app.
- Generate tests that are runnable manually from the terminal.
