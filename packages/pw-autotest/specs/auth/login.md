# Spec: Login

## Meta
- **Priority**: P0
- **Tags**: @smoke, @auth
- **Preconditions**: User is not logged in
- **Target URL**: /login
- **Target Page Object**: LoginPage
- **Browser**: all

---

## Scenario 1: Successful login with valid credentials

### Steps
1. Navigate to /login
2. Fill "Email" field with valid email
3. Fill "Password" field with valid password
4. Click "Sign In" button
5. Wait for dashboard page to load

### Expected Results
- URL contains "/dashboard"
- Welcome message is visible
- Navigation sidebar is visible

### Test Data
| Field    | Value              |
|----------|--------------------|
| Email    | user@example.com   |
| Password | SecurePass123      |

---

## Scenario 2: Login with invalid credentials

### Steps
1. Navigate to /login
2. Fill "Email" field with valid email
3. Fill "Password" field with wrong password
4. Click "Sign In" button

### Expected Results
- URL still contains "/login"
- Error message "Invalid credentials" is visible
- User remains on login page

### Test Data
| Field    | Value              |
|----------|--------------------|
| Email    | user@example.com   |
| Password | WrongPassword123   |

---

## Notes
- Test should work with auto-retry assertions
- Use role-based locators (getByRole, getByLabel)
