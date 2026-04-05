# Run Automation Pipeline

Use this prompt when the user wants the full workflow from story/spec intake to runnable Playwright tests.

## Read first

- `.github/instructions/repo.instructions.md`
- `.github/instructions/requirements-schema.instructions.md`
- `.github/instructions/naming.instructions.md`
- `.github/instructions/artifacts.instructions.md`
- `.github/instructions/pw-autotest.instructions.md`
- `.github/instructions/browser-mcp.instructions.md`
- one relevant source intake instruction file
- `.github/instructions/test-cases.instructions.md`
- `.github/instructions/automation-scripts.instructions.md`
- `.github/instructions/validation.instructions.md`

## Goal

Take a Jira story, Confluence page, or free-text user story and produce:

1. normalized requirements JSON + HTML
2. automation-ready test cases JSON + HTML
3. browser-validated Playwright TypeScript code in the repo root
4. automation manifest JSON + HTML

## Operating rules

- Normalize first. Do not skip directly to test generation.
- Treat Jira, Confluence, and free text equally after normalization.
- Verify locators in the browser before finalizing code when MCP access is available.
- Keep JSON canonical and HTML review-only.
- Make generated tests runnable manually from the terminal.

## Final report

Summarize:

- input source and normalized artifact paths
- generated test-case artifact paths
- created or updated POM, locator, and test files
- browser findings and locator refinements
- remaining gaps, assumptions, or blocked scenarios
- terminal command(s) to run the generated tests
