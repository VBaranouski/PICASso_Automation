# Spec Template

> Copy this template to `specs/{feature}/{scenario}.md` and fill in the details.

---

# Spec: [Feature Name]

## Meta
- **Priority**: P0 | P1 | P2
- **Tags**: @smoke, @regression, @feature-name
- **Preconditions**: [Describe required state before test starts]
- **Target URL**: https://[env].example.com/[path]
- **Target Page Object**: [PageName]Page
- **Browser**: all | chromium | firefox | webkit

---

## Scenario 1: [Short descriptive name]

### Steps
1. Navigate to {Target URL}
2. [Action verb] "[Element accessible name]" [with/to] "[value/target]"
3. Click "[Button/Link name]"
4. Wait for [page/element/URL] to [load/appear/change]

### Expected Results
- URL contains "/expected-path"
- Element "[name]" is visible
- Text "[expected text]" is displayed
- [Element] has value "[expected value]"
- Toast/notification "[message]" appears

### Test Data
| Field      | Value           | Notes              |
|------------|-----------------|--------------------|
| Email      | test@email.com  | Valid format       |
| Password   | SecurePass123!  | Meets requirements |

### Error Scenarios (optional)
- Empty email → "Email is required" error shown
- Invalid email → "Invalid email format" error shown
- Wrong password → "Invalid credentials" error shown

---

## Scenario 2: [Another scenario]

### Steps
1. ...

### Expected Results
- ...

---

## Notes
- [Any additional context, edge cases, known issues]
- [Links to requirements, designs, or Jira tickets]
- [Screenshots or mockups if helpful]
