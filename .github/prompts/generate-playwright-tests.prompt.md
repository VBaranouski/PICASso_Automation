# Generate Playwright Tests

Use this prompt when normalized requirements and automation-ready test cases already exist and you need runnable TypeScript code in the repo root.

## Read first

- `.github/instructions/pw-autotest.instructions.md`
- `.github/instructions/browser-mcp.instructions.md`
- `.github/instructions/automation-scripts.instructions.md`
- `.github/instructions/validation.instructions.md`

## Inputs

- requirements JSON from `docs/ai/`
- test cases JSON from `docs/ai/`

## Output

Generate or update:

- locator factories in `src/locators/`
- page objects in `src/pages/`
- tests in `tests/`
- page exports if needed
- automation manifest JSON + HTML in `docs/ai/`

## Rules

- Validate locators in the live browser first when possible.
- Follow nearby code style in the target feature area.
- Use Allure metadata and `test.step()`.
- Keep tests runnable manually from the terminal.
