import { type Page, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly url = '/GRC_Th/Login';

  private readonly usernameField: Locator;
  private readonly passwordField: Locator;
  private readonly loginButton: Locator;
  private readonly loginSsoButton: Locator;
  private readonly rememberMeCheckbox: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly pageHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameField = page.locator('#Input_UsernameVal');
    this.passwordField = page.locator('#Input_PasswordVal');
    this.loginButton = page.getByRole('button', { name: 'Login' }).first();
    this.loginSsoButton = page.getByRole('button', { name: 'Login SSO' });
    this.rememberMeCheckbox = page.getByRole('checkbox', { name: 'Remember me' });
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot password?' });
    this.pageHeading = page.getByRole('heading', { name: 'PICASso', level: 1 });
  }

  async fillUsername(username: string): Promise<void> {
    await this.usernameField.fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordField.fill(password);
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async clickLoginSso(): Promise<void> {
    await this.loginSsoButton.click();
  }

  async toggleRememberMe(): Promise<void> {
    await this.rememberMeCheckbox.click();
  }

  async login(username: string, password: string): Promise<void> {
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLogin();
  }

  async getHeading(): Promise<Locator> {
    return this.pageHeading;
  }
}
