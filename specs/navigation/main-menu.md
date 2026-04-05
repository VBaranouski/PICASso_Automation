# Spec: Main Menu Navigation

## Meta
- **Priority**: P1
- **Tags**: @regression, @navigation
- **Preconditions**: User is logged in
- **Target URL**: /dashboard
- **Target Page Object**: DashboardPage
- **Browser**: all

---

## Scenario 1: Navigate through main menu items

### Steps
1. Navigate to /dashboard (authenticated)
2. Click each main menu item
3. Verify correct page loads for each item

### Expected Results
- Each menu item navigates to the correct page
- Active menu item is highlighted
- Page content matches the selected menu item

---

## Notes
- Test each menu item independently
- Verify responsive behavior on mobile viewports
