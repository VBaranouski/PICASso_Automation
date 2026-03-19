# Spec: Logout

## Meta
- **Priority**: P0
- **Tags**: @smoke, @auth
- **Preconditions**: User is logged in
- **Target URL**: /dashboard
- **Target Page Object**: DashboardPage
- **Browser**: all

---

## Scenario 1: Successful logout

### Steps
1. Navigate to /dashboard (authenticated)
2. Click user profile menu
3. Click "Logout" button
4. Wait for redirect to login page

### Expected Results
- URL contains "/login"
- Login form is visible
- User session is cleared

---

## Notes
- Requires authenticated state fixture
- Verify session storage is cleared after logout
