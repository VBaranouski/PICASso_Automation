import { type Page, expect } from '@playwright/test';
import { waitForOSScreenLoad } from '../helpers/wait.helper';

export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  abstract readonly url: string;

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForOSLoad(): Promise<void> {
    await waitForOSScreenLoad(this.page);
  }

  async expectUrl(pattern: string | RegExp, options?: { timeout?: number }): Promise<void> {
    await expect(this.page).toHaveURL(pattern, options);
  }
}
