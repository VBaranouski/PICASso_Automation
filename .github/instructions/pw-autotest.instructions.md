# Automation Framework Instructions

## Framework shape

The repository contains:

- fixtures in `src/fixtures/`
- locator factories in `src/locators/`
- page objects in `src/pages/`
- helper utilities in `src/helpers/`
- tests in `tests/`
- environment config in `config/environments/`
- user credentials in `config/users/` (gitignored)

Prefer the existing shape over idealized examples.

## Real repo conventions

- Tests import `test` from `../../src/fixtures` or `@fixtures/index`; preserve the style already used in the target area.
- Page objects extend `BasePage`.
- New page objects must be exported from `src/pages/index.ts`.
- Existing code uses path aliases inside `src/` files: `@pages/*`, `@locators/*`, `@helpers/*`, `@fixtures/*`.
- Public methods should have explicit return types.

## Generation rules

- Prefer `src/locators/*` factory functions for reusable locators.
- Put user actions and assertions in page objects, not in tests.
- Keep tests behavior-focused with `test.step()` and Allure metadata.
- Reuse fixtures instead of creating page objects inside tests when practical.
- Match the local style of nearby tests before introducing a new pattern.
- Do not access private page-object locator bags from tests via patterns like `pageObject['l']`; add page-level helper methods instead.
- Prefer independent tests over `describe.serial`; if shared setup is unavoidable, implement it through a setup project or fixture.

## Required execution workflow

For every new or materially changed scenario:

1. Execute the flow in-browser with Playwright MCP first.
2. Fix locators, controls, waits, and page-object methods until the browser run reflects the intended user path.
3. Re-run the smallest relevant terminal command, typically `npx playwright test <target-spec> --project=<target-project>`.
4. If terminal failures still point to locator/runtime issues, keep fixing the automation.
5. If the scenario fails because the actual product behavior contradicts the expected result, stop normalizing the test to that behavior and classify it as a likely defect for manual review.
6. Update the Markdown and HTML application plans with coverage, blockers, and newly verified cases.

## Locator rules

- Prefer `getByRole`, `getByLabel`, `getByText`, and `getByPlaceholder`.
- Avoid XPath and brittle CSS selectors.
- For OutSystems widgets, a scoped `locator()` fallback is allowed when accessibility locators are insufficient.
- Never guess a locator if Playwright MCP can verify it in the real DOM.
- For native `<select>` controls, use `selectOption()`.
- For OSUI/vscomp dropdowns, use click → `pressSequentially()` → click option.

## Waiting rules

- Never use `waitForTimeout()`.
- Never use `networkidle` for the OutSystems app.
- Use explicit readiness signals such as visible headings, enabled controls, saved-state buttons, or helper methods from `src/helpers/wait.helper.ts`.
- Use `pressSequentially()` for OutSystems user lookup and autocomplete fields.
- Treat OutSystems partial refreshes as DOM replacement events; re-query locators and use stable readiness markers when necessary.

## Validation rules

After generating or updating test code:

- ensure imports compile against the current repo structure
- update page exports when a new POM is added
- prefer `npm run typecheck` as the first validation step
- validate changed locators and full scenario paths in-browser when runtime issues are involved
- prefer targeted test reruns before broader suite reruns
- record whether each failure is an automation issue, a test-data blocker, or a likely product defect
- after meaningful coverage changes, update `docs/ai/automation-testing-plan.md` and `docs/ai/automation-testing-plan.html`

## Manual execution target

Generated tests should be ready to run manually from the terminal with repo scripts such as:

- `npm test`
- `npm run test:smoke`
- `npm run typecheck`
