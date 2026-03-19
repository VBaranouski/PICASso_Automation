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
    await this.l.usernameField.waitFor({ state: 'visible', timeout: 30_000 });
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
}
