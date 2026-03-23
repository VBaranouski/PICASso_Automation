# Testing Patterns & Best Practices — Playwright TypeScript

> This file is part of the Claude Code instruction set.
> Reference it from CLAUDE.md: `## Coding Standards → see .claude/conventions/testing-patterns.md`

---

## Architecture — Four Layer Rule

```
src/locators/     → element selectors ONLY, zero logic
src/pages/        → actions and assertions, NO inline locators
src/components/   → reusable UI components (dropdowns, modals, tables)
src/fixtures/     → page object initialization and shared auth state
tests/            → describe blocks and test cases ONLY
```

**Never mix responsibilities across layers.**
A test file must never contain a locator. A page file must never contain a raw `page.locator()` call.

---

## Locators

All locators live in `src/locators/`. One file per page or feature area.
Locators are **factory functions** — they accept `page` and return a typed object.

```typescript
// src/locators/auth.locators.ts
import { Page } from '@playwright/test';

export const authLocators = (page: Page) => ({
  emailInput:    page.getByLabel('Email'),
  passwordInput: page.getByLabel('Password'),
  submitButton:  page.getByRole('button', { name: 'Sign In' }),
  errorAlert:    page.getByRole('alert'),
});

export type AuthLocators = ReturnType<typeof authLocators>;
```

### Locator Priority — use in this order

1. `getByRole()` — preferred for all interactive elements
2. `getByLabel()` — for form inputs
3. `getByTestId()` — for elements with `data-testid`
4. `getByText()` — for static content verification
5. `locator('.osui-classname')` — last resort for OutSystems widgets only

**NEVER use**: XPath, CSS class selectors, `:nth-child()`, index-based selectors.

---

## Page Objects

Page classes extend `BasePage`. They expose only two types of methods: **Actions** and **Assertions**.
Page objects never contain `expect()` calls at the top level of an action method.

### Base Page

```typescript
// src/pages/base.page.ts
import { Page, expect } from '@playwright/test';

export abstract class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  // OutSystems: wait for loading spinner to disappear
  async waitForOSLoad(): Promise<void> {
    await this.page.locator('.OSLoadingSpinner')
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => {}); // spinner may not appear on fast connections
  }
}
```

### Page Object Structure

```typescript
// src/pages/login.page.ts
import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { authLocators } from '@locators/auth.locators';

export class LoginPage extends BasePage {
  private readonly l;

  constructor(page: Page) {
    super(page);
    this.l = authLocators(page);
  }

  // --- Actions ---

  async login(email: string, password: string): Promise<void> {
    await this.l.emailInput.fill(email);
    await this.l.passwordInput.fill(password);
    await this.l.submitButton.click();
    await this.waitForOSLoad();
  }

  async loginAs(role: 'admin' | 'user'): Promise<void> {
    const credentials = {
      admin: { email: 'admin@example.com', password: 'Admin123' },
      user:  { email: 'user@example.com',  password: 'User123'  },
    } as const;
    await this.goto('/login');
    await this.login(credentials[role].email, credentials[role].password);
  }

  // --- Assertions ---

  async expectError(message: string): Promise<void> {
    await expect(this.l.errorAlert).toContainText(message);
  }

  async expectLoggedIn(): Promise<void> {
    await this.expectUrl(/dashboard/);
  }
}
```

---

## Components

Reusable UI patterns that appear on multiple pages belong in `src/components/`.
**Rule**: if the same UI interaction appears in 2+ pages — extract it to a component.

### OutSystems Dropdown

```typescript
// src/components/os-dropdown.component.ts
import { Page, Locator, expect } from '@playwright/test';

export class OSDropdown {
  private readonly container: Locator;

  constructor(page: Page, label: string) {
    this.container = page.locator('.osui-dropdown')
      .filter({ has: page.getByText(label) });
  }

  private get trigger()     { return this.container.locator('.osui-dropdown-trigger'); }
  private get optionsList() { return this.container.locator('.osui-dropdown-list'); }
  private option(text: string) {
    return this.optionsList.getByRole('option', { name: text });
  }

  async select(optionText: string): Promise<void> {
    await this.trigger.click();
    await this.optionsList.waitFor({ state: 'visible' });
    await this.option(optionText).click();
    await this.optionsList.waitFor({ state: 'hidden' });
  }

  async expectSelected(text: string): Promise<void> {
    await expect(this.trigger).toContainText(text);
  }
}
```

### Modal Component

```typescript
// src/components/modal.component.ts
import { Page, Locator, expect } from '@playwright/test';

export class ModalComponent {
  private readonly root: Locator;

  constructor(page: Page) {
    this.root = page.getByRole('dialog');
  }

  get confirmButton() { return this.root.getByRole('button', { name: 'Confirm' }); }
  get cancelButton()  { return this.root.getByRole('button', { name: 'Cancel' }); }

  async confirm(): Promise<void> {
    await this.confirmButton.click();
    await expect(this.root).not.toBeVisible();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async expectTitle(text: string): Promise<void> {
    await expect(this.root.getByRole('heading')).toHaveText(text);
  }
}
```

---

## Fixtures

Fixtures initialize page objects. Tests receive page objects ready to use — never instantiate page objects inside a test.

### Base Fixture

```typescript
// src/fixtures/base.fixture.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/login.page';
import { DashboardPage } from '@pages/dashboard.page';

type Pages = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Pages>({
  loginPage:     async ({ page }, use) => use(new LoginPage(page)),
  dashboardPage: async ({ page }, use) => use(new DashboardPage(page)),
});

export { expect } from '@playwright/test';
```

### Auth Fixture — pre-authenticated state

```typescript
// src/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/login.page';
import { DashboardPage } from '@pages/dashboard.page';

type AuthFixtures = {
  authenticatedDashboard: DashboardPage;
};

export const test = base.extend<AuthFixtures>({
  authenticatedDashboard: async ({ page }, use) => {
    await new LoginPage(page).loginAs('user');
    await use(new DashboardPage(page));
  },
});
```

**Always import `test` and `expect` from your fixture file** — never from `@playwright/test` directly in test files.

---

## Test Structure

- `test.describe()` groups related scenarios
- One logical behaviour per test
- Test names describe behaviour, not steps: `'shows error on invalid password'` not `'fill and click'`
- `test.beforeEach()` for navigation shared across the whole describe block
- Tests must be fully independent — no shared mutable state between tests

```typescript
// tests/auth/login.spec.ts
import { test, expect } from '@fixtures/index';

test.describe('Login', () => {

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto('/login');
  });

  test('admin can log in successfully @smoke', async ({ loginPage }) => {
    await loginPage.loginAs('admin');
    await loginPage.expectLoggedIn();
  });

  test('shows error on invalid password @regression', async ({ loginPage }) => {
    await loginPage.login('user@example.com', 'wrongpassword');
    await loginPage.expectError('Invalid credentials');
  });

});
```

---

## Assertions

- All assertions live inside Page Object assertion methods
- Never call `expect()` directly inside a test
- Use Playwright web-first assertions — they auto-retry until timeout
- Assert only user-observable outcomes: visible text, URL, element presence

```typescript
// ✅ Correct — assertion in page object method
await loginPage.expectError('Invalid credentials');

// ❌ Wrong — raw expect inside test
await expect(page.getByRole('alert')).toContainText('Invalid credentials');
```

**Never assert**: CSS properties, internal HTML attributes, exact pixel dimensions, implementation details.

---

## Wait Strategies

- Never use `page.waitForTimeout()` or `setTimeout()` — always flaky
- Playwright auto-waits on most actions — trust it
- Use `waitFor({ state })` only when an element's state change is the readiness signal
- Always call `waitForOSLoad()` after navigation, form submission, or screen transitions

```typescript
// ✅ Correct
await this.page.locator('.spinner').waitFor({ state: 'hidden' });
await expect(this.l.submitButton).toBeEnabled();

// ❌ Wrong
await this.page.waitForTimeout(3000);
await new Promise(resolve => setTimeout(resolve, 2000));
```

---

## OutSystems-Specific Rules

### Dropdowns
Always use `OSDropdown` component — NEVER `page.selectOption()`:
```typescript
const roleDropdown = new OSDropdown(page, 'Role');
await roleDropdown.select('Editor');
await roleDropdown.expectSelected('Editor');
```

### Date Pickers
Use click-based interaction — NEVER `fill()` on date inputs:
```typescript
await datePicker.open();
await datePicker.selectDate('2026-03-19');
```

### Toggles
Always check current state before clicking — prevent unintended toggling:
```typescript
await toggle.enable();   // idempotent — only clicks if currently off
await toggle.disable();  // idempotent — only clicks if currently on
```

### Popups / Confirmations
Always use `ModalComponent` — never use raw `page.on('dialog')`:
```typescript
const modal = new ModalComponent(page);
await modal.expectTitle('Confirm deletion');
await modal.confirm();
```

### Loading Indicators
Always wait for OS screen load after any screen transition:
```typescript
await this.submitButton.click();
await this.waitForOSLoad(); // mandatory after every OS screen change
```

---

## Test Data

- Never hardcode test data in test files — use typed data factories
- Dynamic data: use `@faker-js/faker`
- Credentials and URLs: use `config/.env.*` environment files
- Never commit real credentials — use environment variables in CI

```typescript
// src/helpers/data.helper.ts
import { faker } from '@faker-js/faker';

export const generateUser = () => ({
  email:    faker.internet.email(),
  password: faker.internet.password({ length: 12 }),
  name:     faker.person.fullName(),
});
```

---

## Allure Reporting

- Tag every test with `@smoke` or `@regression` in the test title
- Add Allure metadata via `allure-playwright` decorators on describe/test level
- Attach screenshots and traces on failure — configured globally in `playwright.config.ts`
- Use `allure.step()` inside page object methods for readable step names in reports
