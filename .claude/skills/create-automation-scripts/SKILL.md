---
name: create-automation-scripts
description: Use when creating Playwright test scripts from test scenarios or specs, when exploring web UI with Playwright MCP to generate Page Object Models, or when user says "generate tests", "create test cases", "automate this scenario". Requires Playwright MCP server.
---

# Playwright Test Generator

AI-powered test generation that reads test scenarios, explores the real application via Playwright MCP, captures DOM structure, and generates robust Playwright TypeScript tests with Page Object Models.

**Core principle:** Never guess locators — always explore the real DOM via MCP snapshots first.

> **Prerequisite:** Before generating any code, read these convention files:
> - `.claude/rules/typescript-conventions.md`
> - `.claude/rules/testing-patterns.md`

## When to Use

- User provides test scenarios or specs (markdown, verbal, or structured)
- User asks to "generate tests", "create test cases", "automate this flow"
- User wants to explore a web page and create tests from it

**When NOT to use:** fixing existing test failures (use systematic-debugging), running tests (use terminal), writing unit tests (this is for E2E/UI tests only).

## Workflow

### Phase 1: Explore via MCP

1. **Login** using Playwright MCP (`browser_navigate` → `browser_fill_form` → `browser_click`)
2. **Navigate** to target page and take `browser_snapshot`
3. **For each tab/section**, click through and snapshot:
   - Record element roles, names, accessible labels
   - Note grid column headers verbatim
   - Identify filter elements (comboboxes, checkboxes, search boxes)
   - Capture pagination structure
   - Note tab panels and their content

### Phase 2: Generate Code

4. **Create/update POM** in `src/pages/`
5. **Generate test file** in `tests/{feature}/`
6. **Update barrel exports** in `src/pages/index.ts`
7. **Run `npx tsc --noEmit`** to verify TypeScript compiles

## OutSystems App Gotchas

These rules come from real failures. Violating them WILL cause test failures.

### NEVER use `networkidle`
OutSystems keeps WebSocket connections alive. `waitForLoadState('networkidle')` will ALWAYS timeout.
```typescript
// WRONG
await page.waitForLoadState('networkidle');
// RIGHT
await expect(element).toBeVisible({ timeout: 15_000 });
```

### NEVER use `selectOption()`
OutSystems **never** uses native `<select>` — all dropdowns are custom OSUI widgets.
```typescript
// WRONG
await combobox.selectOption({ label: 'Germany' });
// RIGHT — click-to-open → click-to-select
await page.locator('.osui-dropdown').filter({ hasText: 'Select Country' }).click();
await page.getByText('Germany', { exact: true }).click();
```

### ALWAYS scope grid elements to active tabpanel
Multiple tabs = multiple hidden grids in DOM.
```typescript
// WRONG
this.grid = page.getByRole('grid');
// RIGHT
this.grid = page.getByRole('tabpanel').getByRole('grid');
```

### ALWAYS wait for grid data after tab switch
```typescript
async clickTab(tabName: TabType): Promise<void> {
  await tab.click();
  await this.grid.getByRole('columnheader').first().waitFor({ timeout: 15_000 });
}
```

### Handle strict mode violations
OutSystems often renders duplicate elements (hidden + visible). Use `.first()` or more specific locators.

### NEVER hardcode row counts
Test data varies between environments. Assert data exists, not exact counts.

### Use column headers from real DOM
Always snapshot first, then use exact header text (including casing).

## Locator DOs and DON'Ts

| DO | DON'T |
|----|-------|
| Use human-readable text users can see | Use auto-generated IDs (`#b12-Input`, `#ctl00_btn1`) |
| Scope to container (`tabpanel > grid`) | Use unscoped `getByRole('grid')` when multiples exist |
| Use `{ exact: true }` when text is ambiguous | Match partial text that hits multiple elements |
| Verify MCP snapshot text with `evaluate()` | Trust CSS-generated text (asterisks `*`) in snapshots |
| Use `.first()` for OutSystems duplicate elements | Let strict mode violations crash the test |
| Use `pressSequentially()` for search/autocomplete | Use `.fill()` on OutSystems autocomplete inputs |
| Use regex `{ name: /Order #\d+/ }` for dynamic content | Hardcode IDs or dynamic values in locators |
| Add a comment when using `.nth()` or `.first()` | Use positional selectors without explaining why |

## Verification Strategy

### What TO Verify

| User Action | Verification | Example |
|---|---|---|
| Submit a form | Success message appears | `await expect(page.getByText('Product saved')).toBeVisible()` |
| Delete an item | Item disappears from list | `await expect(row).not.toBeVisible()` |
| Navigate to page | Key heading/content visible | `await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()` |
| Select a dropdown | Dependent section updates | `await expect(orgLevel2Select).toBeEnabled()` |
| Open a dialog | Dialog heading visible | `await expect(page.getByRole('dialog')).toBeVisible()` |
| Close a dialog | Dialog gone | `await expect(page.getByRole('dialog')).not.toBeVisible()` |
| Fill and save a form | Saved values persist | `await expect(nameInput).toHaveValue('Expected Name')` |
| Toggle a checkbox | State reflected | `await expect(checkbox).toBeChecked()` |

### What NOT to Verify

| Anti-Pattern | Why It Fails | Do Instead |
|---|---|---|
| `toHaveURL(/.*ProductDetail\?ProductId=(?!0)\d+/)` | Tests routing internals, not UX | Verify key element visible on target page |
| `toHaveURL('https://staging.example.com/orders')` | Env-specific, breaks across environments | Loose check: `toHaveURL(/\/orders/)` |
| `toHaveAttribute('data-status', 'confirmed')` | Internal attribute user never sees | Verify visible status text |
| `toHaveCSS('background-color', 'rgb(0,123,255)')` | Theme-dependent | Verify visible state change |
| `page.waitForResponse('**/api/orders')` | Couples UI test to API contract | Verify the UI result |
| `expect(rowCount).toBe(42)` | Data changes between environments | `expect(firstRow).toBeVisible()` |

### URL Verification Rules

```typescript
// OK — loose section check
await expect(page).toHaveURL(/.*GRC_PICASso/);
await expect(page).not.toHaveURL(/\/login/);

// BAD — complex regex validating query params, IDs, tokens
await expect(page).toHaveURL(/.*ProductDetail\?ProductId=(?!0)\d+/);
```

### Verification Rules
1. One primary assertion per action outcome
2. Prefer `toBeVisible()` over `toBeAttached()`
3. Default assertion timeout (10s) is sufficient — only increase for known slow loads
4. Never use `waitForTimeout()` before assertions — assertions auto-retry

## Waiting & Timeout Strategy

> **Never add a timeout to an individual action or assertion.**
> Identify a UI readiness signal and `waitFor()` on that signal before acting.

### Readiness Signals

| Signal | When to Use |
|---|---|
| Page heading appears | After navigation |
| OutSystems loading overlay disappears | After screen navigation / data fetch |
| Content placeholder resolves | Sections loading async data |
| Table/list populates | Pages that load data asynchronously |
| Element becomes enabled | Forms that disable inputs until data loads |
| ~~`networkidle`~~ | **BANNED** — OutSystems WebSocket keeps it alive forever |

### Waiting Patterns

**Wait for content (most common):**
```typescript
await page.getByRole('link', { name: 'Products' }).click();
await page.getByRole('heading', { name: 'Product List' }).waitFor({ timeout: 30_000 });
// Page ready — use default timeouts for subsequent actions
```

**Wait for OutSystems loading overlay:**
```typescript
await page.getByRole('button', { name: 'Search' }).click();
await waitForOSScreenLoad(page);  // see src/helpers/wait.helper.ts
```

**Wait for element to become enabled:**
```typescript
await page.getByLabel('Email').fill('user@example.com');
await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
```

### What NOT to Do

```typescript
// NEVER — hard sleep
await page.waitForTimeout(5000);
// NEVER — inline timeout on click
await page.getByRole('button', { name: 'Submit' }).click({ timeout: 60_000 });
// NEVER — large timeout on assertion hides issues
await expect(page.getByText('Success')).toBeVisible({ timeout: 60_000 });
// NEVER — OutSystems WebSocket keeps network alive
await page.waitForLoadState('networkidle');
```

### Reusable Wait Helpers

```typescript
import { waitForPageReady, waitForOSScreenLoad, waitForTableData, navigateAndWait } from '../../src/helpers/wait.helper';

await navigateAndWait(page, 'Orders', 'Order History');
await waitForTableData(page);
await waitForOSScreenLoad(page);
```

## OutSystems-Specific Patterns

### OutSystems ID Patterns — NEVER Use

IDs starting with `b` + number (`b1-`, `b12-`) or widget type prefix (`Input_`, `Dropdown_`, `Button_`, `Link_`) are auto-generated and shift on republish. **Never use these.**

### Stable Locator Strategies

1. **Text-based (most reliable):** `getByRole()`, `getByText()`, `getByPlaceholder()`, `getByLabel()`
2. **Scope to `[data-block]`:** OutSystems Blocks have stable `data-block` attributes
   ```typescript
   const loginBlock = page.locator('[data-block="LoginForm"]');
   await loginBlock.getByPlaceholder('Username').fill('testuser');
   ```
3. **`data-testid` via Extended Properties:** Request from dev team when needed

### Widget Interaction Patterns

**Dropdown (NEVER `selectOption()`):**
```typescript
await page.locator('.osui-dropdown').filter({ hasText: 'Select Country' }).click();
await page.locator('.osui-dropdown__list').waitFor();
await page.getByText('Germany', { exact: true }).click();
```

**Searchable Dropdown / Autocomplete:**
```typescript
await page.locator('.osui-dropdown').filter({ hasText: 'Select Product' }).click();
await page.locator('.osui-dropdown__search-input').fill('Widget');
await page.getByText('Widget Pro 2000', { exact: true }).click();
```

**Date Picker:**
```typescript
const dateInput = page.getByLabel('Start Date');
await dateInput.clear();
await dateInput.fill('2025-03-15');
await dateInput.press('Tab');  // triggers OutSystems client-side onChange
```

**Toggle / Switch:**
```typescript
await page.getByText('Enable notifications').click();
```

**Popup / Modal:**
```typescript
await page.getByRole('button', { name: 'Add Item' }).click();
await page.locator('.osui-popup').waitFor();
await page.locator('.osui-popup').getByRole('button', { name: 'Save' }).click();
await page.locator('.osui-popup').waitFor({ state: 'hidden' });
```

**Tabs:**
```typescript
await page.getByRole('tab', { name: 'Shipping' }).click();
await page.locator('.osui-tabs__content--is-active').waitFor();
```

**Table Records vs List Records:**
```typescript
// Table Records — standard <table>
const table = page.getByRole('table');
await table.getByRole('row', { name: /ORD-1024/ }).getByRole('link', { name: 'Details' }).click();

// List Records — renders as <div> list
const list = page.locator('[data-block="OrdersList"]');
await list.getByText('ORD-1024').click();
```

### Loading Indicators

| Indicator | CSS Selector | Meaning |
|---|---|---|
| Screen loading overlay | `.feedback-message-loading` | Screen Aggregate running |
| Content placeholder | `.content-placeholder.loading` | Section still loading |
| Skeleton / shimmer | `.osui-skeleton` | Placeholder for pending data |
| Disabled buttons | `button[disabled]` | Server action processing |
| Feedback message | `.feedback-message-success`, `.feedback-message-error` | Server action completed |

**Standard wait sequence:**
```typescript
await page.getByRole('link', { name: 'Products' }).click();
await waitForOSScreenLoad(page);
await page.getByRole('heading', { name: 'Product Catalog' }).waitFor();
```

### Requesting Testability Improvements

| Problem | Request |
|---|---|
| Icon-only button with no text | Add `aria-label` via Extended Properties |
| Multiple identical links in a list | Add `data-testid` with dynamic value |
| Label not associated with input | Use OutSystems Label widget `InputWidget` parameter |
| No stable parent container | Wrap in named Block or Container with `data-testid` |

## Allure Metadata (Required)

```typescript
await allure.suite('Feature Area');
await allure.severity('critical' | 'normal' | 'minor');
await allure.tag('smoke' | 'regression');
await allure.description('What this test verifies');
```

## File Naming

| Type | Path | Convention |
|------|------|-----------|
| Test file | `tests/{feature}/{name}.spec.ts` | kebab-case |
| Page Object | `src/pages/{Name}Page.ts` | PascalCase |
| Barrel export | `src/pages/index.ts` | Always update |

## Quick Checklist

**Architecture (four-layer rule):**
- [ ] Locators in `src/locators/*.locators.ts` as factory functions
- [ ] Page objects use `private readonly l` — no raw `page.locator()` inside POM
- [ ] Components created for UI patterns used in 2+ pages
- [ ] No `expect()` directly in test files — all via POM assertion methods
- [ ] POMs injected via fixtures — not instantiated in tests
- [ ] Class member order: private fields → constructor → actions → assertions → helpers

**TypeScript:**
- [ ] Imports use path aliases (`@pages/`, `@fixtures/`, `@locators/`, `@helpers/`)
- [ ] No `any` type
- [ ] All public POM methods have explicit return types

**Test quality:**
- [ ] Explored all target pages/tabs via MCP snapshots
- [ ] Used exact locator text from DOM (not guessed)
- [ ] Scoped grid elements to `tabpanel`
- [ ] No `networkidle`, no `waitForTimeout()`, no `selectOption()`
- [ ] No hardcoded row counts or dropdown values
- [ ] `test.setTimeout(90_000)` for OutSystems
- [ ] All Allure metadata present
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] Updated barrel exports
- [ ] Assertions verify user-visible outcomes, not internals
- [ ] No inline `{ timeout: ... }` on actions/assertions — use `waitFor()` then assert
- [ ] Uses `waitForOSScreenLoad()` after navigation / data-triggering actions
- [ ] OutSystems widget interactions use OSUI class patterns

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `waitForLoadState('networkidle')` | Wait for specific element visibility |
| `dropdown.selectOption({ label: 'X' })` | Click trigger → click option text |
| `getByRole('grid')` unscoped | `getByRole('tabpanel').getByRole('grid')` |
| Asserting `rowCount > 10` | Assert `row.nth(1).toBeVisible()` |
| `getByText('exact text')` strict violation | Add `.first()` or use `locator('text=...')` |
| Checking grid immediately after tab click | Wait for `columnheader` first |
| Guessing column header names | Snapshot first, copy exact text |
| `page.waitForTimeout()` | Use auto-retrying assertions |
| `toHaveURL(/complex regex/)` | Verify element visibility instead |
| `getByText('Product Owner*')` with CSS asterisk | `getByText('Product Owner', { exact: true })` |
| `locator('#b12-b34-Input')` auto-generated ID | `getByRole('textbox', { name: '...' })` |
| `.fill()` on search/autocomplete | `.pressSequentially(query, { delay: 150 })` |
| `expect(rows).toHaveCount(42)` exact count | `expect(row.nth(1)).toBeVisible()` |
| `toHaveAttribute('data-status', ...)` | Verify visible status text |
| `toHaveCSS('background-color', ...)` | Verify visible state change |
| `expect(text).toBeVisible({ timeout: 60_000 })` | `waitFor({ timeout: 30_000 })` then `expect().toBeVisible()` |
| `button.click({ timeout: 60_000 })` | `waitFor()` on readiness signal, then `click()` |
| `locator('#Input_Username')` | `getByPlaceholder()` or scope to `[data-block]` |
| Missing `waitForOSScreenLoad()` after nav | Add `waitForOSScreenLoad(page)` before interacting |
| Inline locators in POM constructor | Move to `src/locators/` factory function |
| `expect()` directly in test | Create POM assertion method |
| `new LoginPage(page)` in test body | Inject via fixture |
| `import { test } from '@playwright/test'` | `import { test } from '@fixtures/index'` |
| `import { LoginPage } from '../../src/pages'` | `import { LoginPage } from '@pages/index'` |
| `const x: any = ...` | Define interface or use `unknown` |
