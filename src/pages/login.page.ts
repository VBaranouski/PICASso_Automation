import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { authLocators, type AuthLocators } from '@locators/auth.locators';

export class LoginPage extends BasePage {
  readonly url = '/GRC_Th/Login';

  private readonly l: AuthLocators;

  constructor(page: Page) {
    super(page);
    this.l = authLocators(page);
  }

  // --- Public locator accessors ---

  get usernameField(): Locator     { return this.l.usernameField; }
  get passwordField(): Locator     { return this.l.passwordField; }
  get loginButton(): Locator       { return this.l.loginButton; }
  get loginSsoButton(): Locator    { return this.l.loginSsoButton; }
  get rememberMeCheckbox(): Locator { return this.l.rememberMeCheckbox; }
  get forgotPasswordLink(): Locator { return this.l.forgotPasswordLink; }
  get pageHeading(): Locator       { return this.l.pageHeading; }

  // --- Actions ---

  async fillUsername(username: string): Promise<void> {
    await this.l.usernameField.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.l.passwordField.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.l.loginButton.click();
  }

  async clickLoginSso(): Promise<void> {
    await this.l.loginSsoButton.click();
  }

  async clickForgotPassword(): Promise<void> {
    await this.l.forgotPasswordLink.click();
  }

  async toggleRememberMe(): Promise<void> {
    await this.l.rememberMeCheckbox.click();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  override async waitForPageLoad(): Promise<void> {
    await super.waitForPageLoad();

    for (let attempt = 1; attempt <= 4; attempt++) {
      const loginReady = await Promise.any([
        this.l.usernameField.waitFor({ state: 'visible', timeout: 20_000 }),
        this.l.loginButton.waitFor({ state: 'visible', timeout: 20_000 }),
      ]).then(() => true).catch(() => false);

      if (loginReady) {
        return;
      }

      if (attempt === 4) {
        break;
      }

      const accessDeniedVisible = await this.page.getByRole('heading', { name: /Access Denied/i }).isVisible().catch(() => false);
      const timeoutAlertVisible = await this.page.getByRole('alert').filter({ hasText: /The connection has timed out/i }).isVisible().catch(() => false);
      const currentUrl = this.page.url();

      if (accessDeniedVisible || timeoutAlertVisible) {
        const retryUrl = currentUrl.startsWith('http://')
          ? currentUrl.replace(/^http:\/\//, 'https://')
          : currentUrl;
        await this.page.goto(retryUrl, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      } else if (/GRC_Th\/Login/i.test(currentUrl)) {
        await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      } else {
        await this.page.goto(this.url, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      }
    }

    await this.l.usernameField.waitFor({ state: 'visible', timeout: 60_000 });
  }

  async getHeading(): Promise<Locator> {
    return this.l.pageHeading;
  }

  // --- Assertions ---

  async expectPageElements(): Promise<void> {
    await expect(this.l.pageHeading).toBeVisible();
    await expect(this.l.usernameField).toBeVisible();
    await expect(this.l.passwordField).toBeVisible();
    await expect(this.l.loginButton).toBeVisible();
    await expect(this.l.loginSsoButton).toBeVisible();
    await expect(this.l.rememberMeCheckbox).toBeVisible();
    await expect(this.l.forgotPasswordLink).toBeVisible();
  }

  async expectOnLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/.*Login/);
  }

  /**
   * Asserts that clicking SSO redirected the browser to the Ping SSO identity provider.
   * The expected URL pattern is the external Ping SSO endpoint.
   */
  async expectSsoRedirectToPingId(): Promise<void> {
    await this.page.waitForURL(/ping-sso/, { timeout: 15_000 });
    await expect(this.page).toHaveURL(/ping-sso/);
  }

  /**
   * Asserts that the Forgot Password link navigated away from the login page
   * to a password reset / recovery page.
   * NOTE: Currently this is a KNOWN BUG — the link has href="#" and does not redirect.
   */
  async expectForgotPasswordRedirect(): Promise<void> {
    await expect(this.page).not.toHaveURL(/.*Login/, { timeout: 10_000 });
  }
}
