# Copilot Instructions

This project uses Playwright with TypeScript for E2E test automation.

## Key Rules
- Use semantic locators only (getByRole, getByLabel, getByTestId)
- Never use CSS selectors or XPath
- Use auto-retrying assertions (toBeVisible, toHaveURL, toHaveText)
- No hardcoded waits (no waitForTimeout)
- Follow Page Object Model pattern
- Import test/expect from `src/fixtures`
- Add Allure metadata to every test
