# TypeScript Coding Conventions

> This file is part of the Claude Code instruction set.
> Reference it from CLAUDE.md: `## Coding Standards → see .claude/conventions/typescript-conventions.md`

---

## General Standards

- Use TypeScript strict mode at all times (`"strict": true` in tsconfig.json)
- Prefer `const` over `let` — never use `var`
- Use ES2022+ features: optional chaining `?.`, nullish coalescing `??`, async/await
- 2-space indentation, single quotes, trailing commas
- Always define return types explicitly on public methods

---

## Naming Conventions

| Entity | Style | Example |
|---|---|---|
| Classes | PascalCase | `LoginPage`, `OSDropdown` |
| Methods | camelCase | `clickSubmit()`, `selectOption()` |
| Variables | camelCase | `userName`, `pageTitle` |
| Constants | UPPER_SNAKE_CASE | `MAX_TIMEOUT`, `BASE_URL` |
| Types / Interfaces | PascalCase | `UserRole`, `TestConfig` |
| Files | kebab-case | `login.page.ts`, `os-dropdown.component.ts` |
| Test files | `*.spec.ts` suffix | `login.spec.ts` |

---

## Class Member Order

Always follow this order inside a class:

```typescript
export class LoginPage extends BasePage {
  // 1. Private fields
  private readonly l;

  // 2. Constructor
  constructor(page: Page) {
    super(page);
    this.l = loginLocators(page);
  }

  // 3. Public Actions
  async login(email: string, password: string): Promise<void> { ... }

  // 4. Public Assertions
  async expectLoggedIn(): Promise<void> { ... }

  // 5. Private helpers
  private async waitForRedirect(): Promise<void> { ... }
}
```

---

## Type Safety

- NEVER use `any` — use `unknown` with narrowing, or define a proper interface
- Use union types for simple string sets: `type Role = 'admin' | 'user' | 'guest'`
- Use `as const` for readonly object maps
- Use `ReturnType<typeof fn>` to derive types from locator factory functions
- Non-null assertion `!` is forbidden unless unavoidable — always add a comment explaining why

---

## Null Safety

```typescript
// ✅ Correct
const name = user?.profile?.name ?? 'Anonymous';

// ❌ Wrong
const name = user && user.profile && user.profile.name ? user.profile.name : 'Anonymous';
```

- Prefer early returns (guard clauses) over nested conditionals
- Never assume an optional value is present without checking

---

## Imports

- Always use path aliases from `tsconfig.json`: `@pages/`, `@locators/`, `@fixtures/`, `@helpers/`
- Never use relative paths that go up more than one level: avoid `../../locators/`
- Import specific named exports — no wildcard imports (`import * as`)
- Group imports: external libraries → internal aliases → relative paths

```typescript
// ✅ Correct
import { expect } from '@playwright/test';
import { BasePage } from '@pages/base.page';
import { loginLocators } from '@locators/auth.locators';

// ❌ Wrong
import * as playwright from '@playwright/test';
import { loginLocators } from '../../locators/auth.locators';
```

---

## Async / Await

- Always use `async/await` — never `.then()/.catch()` chains
- Always `await` Playwright actions — never fire-and-forget
- Use `Promise.all()` only when operations are truly independent

---

## Error Handling

- Never swallow errors silently without a comment
- Use `.catch(() => {})` only for intentionally optional operations

```typescript
// ✅ Correct — OS spinner may not appear on fast connections
await this.page.locator('.OSLoadingSpinner')
  .waitFor({ state: 'hidden', timeout: 10_000 })
  .catch(() => {});

// ❌ Wrong — silent swallow with no explanation
await someAction().catch(() => {});
```

---

## Comments

- Write self-documenting code — good naming reduces need for comments
- Add comments only to explain *why*, never *what*
- Use JSDoc for public methods in base classes and shared utilities
- Delete outdated comments — stale comments are worse than no comments
