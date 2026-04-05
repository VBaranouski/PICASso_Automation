import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Wait for a page heading to appear after navigation.
 * Use as the primary readiness signal after clicking a nav link.
 */
export async function waitForPageReady(page: Page, headingText: string | RegExp): Promise<void> {
  await page.getByRole('heading', { name: headingText }).waitFor({ timeout: 30_000 });
}

/**
 * Wait for OutSystems screen loading overlay and content placeholders to disappear.
 * OutSystems shows overlays while Screen Aggregates / Data Actions run client-side.
 *
 * Key indicators handled:
 * - `.feedback-message-loading` — Screen Aggregate loading overlay
 * - `.os-loading-overlay` — general loading overlay
 * - `.content-placeholder.loading` — section-level data placeholder
 *
 * Note: avoid broad `[class*="loading"]` — it matches OutSystems button
 * spinners (`.osui-btn-loading-show-spinner`) that stay visible during save.
 */
export async function waitForOSScreenLoad(page: Page): Promise<void> {
  const overlay = page.locator('.feedback-message-loading, .os-loading-overlay');
  if (await overlay.first().isVisible().catch(() => false)) {
    await overlay.first().waitFor({ state: 'hidden', timeout: 30_000 });
  }

  const placeholder = page.locator('.content-placeholder.loading');
  if (await placeholder.first().isVisible().catch(() => false)) {
    await placeholder.first().waitFor({ state: 'hidden', timeout: 30_000 });
  }
}

/**
 * Wait for a table to have at least one data row.
 * Use after navigation to a list/table page where data loads asynchronously.
 */
export async function waitForTableData(page: Page, tableLocator?: Locator): Promise<void> {
  const table = tableLocator ?? page.getByRole('table');
  await expect(table.getByRole('row')).not.toHaveCount(0, { timeout: 15_000 });
}

/**
 * Combined navigation helper for OutSystems screens.
 * Clicks a link, waits for the OutSystems loading overlay to clear,
 * then waits for the destination page's heading to appear.
 */
export async function navigateAndWait(
  page: Page,
  linkName: string | RegExp,
  headingText: string | RegExp,
): Promise<void> {
  await page.getByRole('link', { name: linkName }).click();
  await waitForOSScreenLoad(page);
  await page.getByRole('heading', { name: headingText }).waitFor({ timeout: 30_000 });
}

/**
 * Wait for a URL pattern after navigation.
 * Only use for coarse section checks, not complex query param validation.
 */
export async function waitForUrlChange(page: Page, urlPattern: RegExp, timeout = 10000): Promise<void> {
  await page.waitForURL(urlPattern, { timeout });
}
