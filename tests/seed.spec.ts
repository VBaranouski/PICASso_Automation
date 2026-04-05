import { test, expect } from '../src/fixtures';
import * as allure from 'allure-js-commons';

test.describe('Environment Validation', () => {
  test('should load the base URL successfully @smoke', async ({ page }) => {
    await allure.suite('Environment');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('SMOKE-SEED-001: Verify that the base URL is reachable and returns a valid page');

    await test.step('Navigate to base URL', async () => {
      await page.goto('/');
    });

    await test.step('Verify page loaded', async () => {
      await expect(page).not.toHaveURL('about:blank');
    });
  });
});
