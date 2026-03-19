import { test } from '../../src/fixtures';
import * as allure from 'allure-js-commons';

test.describe('Authentication - Login @smoke', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
  });

  test('should display login page with correct elements', async ({ loginPage }) => {
    await allure.suite('Authentication');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('Verify login page loads with all expected UI elements');

    await test.step('Verify all login page elements are visible', async () => {
      await loginPage.expectPageElements();
    });
  });

  test('should redirect to landing page when logging in with valid credentials', async ({ loginPage, landingPage, userCredentials }) => {
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
      await landingPage.expectPageLoaded({ timeout: 60_000 });
    });

    await test.step('Verify user name is displayed in header', async () => {
      await landingPage.expectUserDisplayed(userCredentials.login);
    });

    await test.step('Verify navigation menu is visible', async () => {
      await landingPage.expectNavigationMenuVisible();
    });

    await test.step('Verify landing page tabs are present', async () => {
      await landingPage.expectTabsPresent();
    });
  });

  test('should show error when logging in with invalid credentials', async ({ loginPage }) => {
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
      await loginPage.expectOnLoginPage();
    });
  });

  test('should show error when submitting empty credentials', async ({ loginPage }) => {
    await allure.suite('Authentication');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify validation when submitting login form with empty fields');

    await test.step('Click Login without filling credentials', async () => {
      await loginPage.clickLogin();
    });

    await test.step('Verify user stays on login page', async () => {
      await loginPage.expectOnLoginPage();
    });
  });
});
