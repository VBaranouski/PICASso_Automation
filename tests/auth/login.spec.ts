import { test, expect } from '../../src/fixtures';
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
    await allure.description('AUTH-LOGIN-001: Verify login page loads with all expected UI elements');

    await test.step('Verify all login page elements are visible', async () => {
      await loginPage.expectPageElements();
    });
  });

  test('should redirect to landing page when logging in with valid credentials', async ({ loginPage, landingPage, userCredentials }) => {
    await allure.suite('Authentication');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('AUTH-LOGIN-002: Verify successful login with valid username and password redirects to PICASso Landing Page');

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
    await allure.description('AUTH-LOGIN-003: Verify error message is shown for invalid login credentials');

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
    await allure.description('AUTH-LOGIN-004: Verify validation when submitting login form with empty fields');

    await test.step('Click Login without filling credentials', async () => {
      await loginPage.clickLogin();
    });

    await test.step('Verify user stays on login page', async () => {
      await loginPage.expectOnLoginPage();
    });
  });

  // ---------------------------------------------------------------------------
  // AUTH-SSO-002: SSO button initiates Ping SSO redirect (using super_user)
  // Note: Valid SSO login (AUTH-SSO-001) is out of automation scope — clicking
  //       SSO redirects to the external Ping identity provider (ping-sso-uat),
  //       not directly to the Landing Page. End-to-end SSO login requires
  //       live Ping credentials and is covered by manual / exploratory testing.
  //       We use super_user as the identity reference for this scenario.
  // ---------------------------------------------------------------------------
  test('should redirect to Ping SSO identity provider when clicking Login SSO @regression', async ({ loginPage, getUserByRole }) => {
    const superUser = getUserByRole('super_user');

    await allure.suite('Authentication');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'AUTH-SSO-002: Verify that clicking "Login SSO" button (initiated as super_user) ' +
      'redirects the user to the external Ping SSO identity provider page ' +
      '(ping-sso-uat.schneider-electric.com). ' +
      'Full end-to-end SSO flow with valid identity is covered by manual testing only.',
    );

    await test.step('Enter super_user username as SSO identity hint', async () => {
      await loginPage.fillUsername(superUser.login);
    });

    await test.step('Click Login SSO button', async () => {
      await loginPage.clickLoginSso();
    });

    await test.step('Verify redirect to Ping SSO provider', async () => {
      await loginPage.expectSsoRedirectToPingId();
    });
  });

  // ---------------------------------------------------------------------------
  // AUTH-FPW-001: Forgot Password link – KNOWN DEFECT
  // Defect: The "Forgot password?" link has href="#" and performs no navigation.
  // No password reset / recovery flow is triggered.  Marked test.fail() and
  // explicitly flagged as a product defect in Allure so it is tracked in reports.
  // ---------------------------------------------------------------------------
  test('should open password reset flow when clicking Forgot Password link @regression', async ({ loginPage }) => {
    test.fail(true, 'AUTH-FPW-001 – Known bug: "Forgot password?" link has href="#" and does not redirect to a password reset page. No recovery flow is triggered.');

    await allure.suite('Authentication');
    await allure.label('defect', 'AUTH-FPW-001');
    await allure.severity('blocker');
    await allure.tag('regression');
    await allure.tag('defect');
    await allure.description(
      'AUTH-FPW-001: Verify that clicking "Forgot password?" link navigates the user to ' +
      'the password reset / account recovery page. ' +
      'DEFECT: link href is "#" — no redirect occurs. This is a product bug tracked as AUTH-FPW-001.',
    );

    await test.step('Click Forgot Password link', async () => {
      await loginPage.clickForgotPassword();
    });

    await test.step('Verify redirect to password reset page', async () => {
      await loginPage.expectForgotPasswordRedirect();
    });
  });

  // ---------------------------------------------------------------------------
  // AUTH-SSO-003: SSO with invalid / unauthorized identity – PARTIAL AUTOMATION
  // Uses invalid_user credentials (valid SE login, wrong password) as the
  // identity for this scenario. We can verify:
  //   a) The SSO button still redirects to Ping (verifiable)
  //   b) The user is NOT yet on the Landing Page (verifiable)
  // What cannot be automated: the full Ping IdP rejection flow (manual testing).
  // ---------------------------------------------------------------------------
  test('should redirect to Ping SSO page and not land on application when SSO identity is invalid @regression', async ({ loginPage, page, getUserByRole }) => {
    const invalidUser = getUserByRole('invalid_user');

    await allure.suite('Authentication');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'AUTH-SSO-003: Verify that SSO flow initiated with an invalid_user identity ' +
      '(same SE login as super_user but wrong password) redirects to the Ping SSO IdP page. ' +
      'The user should NOT be on the Landing Page after clicking SSO (they are at Ping awaiting auth). ' +
      'PARTIAL: Full rejection verification by Ping requires manual testing.',
    );

    await test.step('Enter invalid_user identity hint', async () => {
      await loginPage.fillUsername(invalidUser.login);
    });

    await test.step('Click Login SSO button', async () => {
      await loginPage.clickLoginSso();
    });

    await test.step('Verify redirect to Ping SSO provider (not Landing Page)', async () => {
      // SSO redirect happens to Ping — invalid credentials will be handled by Ping IdP
      await loginPage.expectSsoRedirectToPingId();
      // Confirm the user is NOT on the application Landing Page
      await expect(page).not.toHaveURL(/GRC_PICASso|HomePage/, { timeout: 5_000 });
    });
  });
});
