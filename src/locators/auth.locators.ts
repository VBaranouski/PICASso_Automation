import { type Page } from '@playwright/test';

export const authLocators = (page: Page) => ({
  usernameField:      page.locator('#Input_UsernameVal'),
  passwordField:      page.locator('#Input_PasswordVal'),
  loginButton:        page.getByRole('button', { name: 'Login' }).first(),
  loginSsoButton:     page.getByRole('button', { name: 'Login SSO' }),
  rememberMeCheckbox: page.getByRole('checkbox', { name: 'Remember me' }),
  forgotPasswordLink: page.getByRole('link', { name: 'Forgot password?' }),
  pageHeading:        page.getByRole('heading', { name: 'PICASso', level: 1 }),
});

export type AuthLocators = ReturnType<typeof authLocators>;
