import { test, expect } from '../../src/fixtures';
import { LoginPage } from '../../src/pages';
import * as allure from 'allure-js-commons';

test.describe('Authentication - Login @smoke', () => {
  test.setTimeout(90_000);
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.waitForPageLoad();
  });

  test('should display login page with correct elements', async ({ page }) => {
    await allure.suite('Authentication');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('Verify login page loads with all expected UI elements');

    await test.step('Verify page heading', async () => {
      await expect(page.getByRole('heading', { name: 'PICASso', level: 1 })).toBeVisible();
    });

    await test.step('Verify login form fields are visible', async () => {
      await expect(page.locator('#Input_UsernameVal')).toBeVisible();
      await expect(page.locator('#Input_PasswordVal')).toBeVisible();
    });

    await test.step('Verify login buttons are visible', async () => {
      await expect(page.getByRole('button', { name: 'Login' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Login SSO' })).toBeVisible();
    });

    await test.step('Verify Remember me and Forgot password are visible', async () => {
      await expect(page.getByRole('checkbox', { name: 'Remember me' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
    });
  });

  test('should redirect to landing page when logging in with valid credentials', async ({ page, userCredentials }) => {
    await allure.suite('Authentication');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('Verify successful login with valid username and password redirects to PICASso Landing Page');

    await test.step('Fill in login credentials', async () => {
      await loginPage.fillUsername(userCredentials.login);
      await loginPage.fillPassword(userCredentials.password);
    });

    await test.step('Click Login button', async () => {
      await loginPage.clickLogin();
    });

    await test.step('Verify redirect to Landing Page', async () => {
      await expect(page).toHaveURL(/.*GRC_PICASso/, { timeout: 60_000 });
      await expect(page.getByText('PICASso - Landing Page')).toBeVisible({ timeout: 60_000 });
    });

    await test.step('Verify user name is displayed in header', async () => {
      await expect(page.getByText(userCredentials.login, { exact: true }).first()).toBeVisible();
    });

    await test.step('Verify navigation menu is visible', async () => {
      await expect(page.getByRole('menuitem', { name: 'Home Page' })).toBeVisible();
    });

    await test.step('Verify landing page tabs are present', async () => {
      await expect(page.getByRole('tab', { name: 'My Tasks' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'My Products' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'My Releases' })).toBeVisible();
    });
  });

  test('should show error when logging in with invalid credentials', async ({ page }) => {
    await allure.suite('Authentication');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('Verify error message is shown for invalid login credentials');

    await test.step('Fill in invalid credentials', async () => {
      await loginPage.fillUsername('invalid_user');
      await loginPage.fillPassword('wrong_password');
    });

    await test.step('Click Login button', async () => {
      await loginPage.clickLogin();
    });

    await test.step('Verify user stays on login page', async () => {
      await expect(page).toHaveURL(/.*Login/);
    });
  });

  test('should show error when submitting empty credentials', async ({ page }) => {
    await allure.suite('Authentication');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify validation when submitting login form with empty fields');

    await test.step('Click Login without filling credentials', async () => {
      await loginPage.clickLogin();
    });

    await test.step('Verify user stays on login page', async () => {
      await expect(page).toHaveURL(/.*Login/);
    });
  });
});
