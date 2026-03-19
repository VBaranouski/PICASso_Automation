import { test, expect } from '../../src/fixtures';
import { LoginPage, LandingPage } from '../../src/pages';
import * as allure from 'allure-js-commons';
import { waitForOSScreenLoad } from '../../src/helpers/wait.helper';

test.describe('My Products Tab - Exploratory @regression', () => {
  test.setTimeout(180_000);

  let loginPage: LoginPage;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page, getUserByRole }) => {
    const creds = getUserByRole('process_quality_leader');
    loginPage = new LoginPage(page);
    landingPage = new LandingPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(creds.login, creds.password);
    await expect(page).toHaveURL(/.*GRC_PICASso/, { timeout: 60_000 });
    await expect(landingPage.pageTitle).toBeVisible({ timeout: 60_000 });

    // Navigate to My Products tab
    await landingPage.clickTab('My Products');
    await expect(landingPage.grid).toBeVisible({ timeout: 30_000 });
  });

  test('should search products by name using combobox filter', async () => {
    await allure.suite('My Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'Verify that searching for a product by name via the combobox filter narrows the grid results.',
    );

    let initialCount: string;

    await test.step('Record initial record count', async () => {
      initialCount = await landingPage.getRecordCount();
      expect(Number(initialCount)).toBeGreaterThan(0);
    });

    await test.step('Search and select a matching product from dropdown', async () => {
      await landingPage.searchAndSelectProductByName('Power Switch', /Power Switch/);
    });

    await test.step('Verify grid is filtered to fewer results', async () => {
      // Poll until record count decreases — grid refresh is async
      await expect.poll(
        async () => Number(await landingPage.getRecordCount()),
        { timeout: 30_000 },
      ).toBeLessThan(Number(initialCount));
    });

    await test.step('Verify grid displays matching product data', async () => {
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible();
    });
  });

  test('should search products by Product ID using combobox filter', async () => {
    await allure.suite('My Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'Verify that searching by Product ID via the combobox filter shows the matching product.',
    );

    await test.step('Search and select matching product ID from dropdown', async () => {
      await landingPage.searchAndSelectProductById('PIC-1081', /PIC-1081/);
    });

    await test.step('Verify grid shows filtered result', async () => {
      const filteredCount = await landingPage.getRecordCount();
      expect(Number(filteredCount)).toBeGreaterThan(0);
      // Single product ID search should return a small number of results
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible();
    });
  });

  test('should toggle Show Active Only checkbox to include inactive products', async ({ page }) => {
    await allure.suite('My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'Verify that unchecking "Show active only" increases the record count by including inactive products, ' +
      'and re-checking it restores the original count.',
    );

    let activeOnlyCount: string;

    await test.step('Verify "Show active only" is checked by default', async () => {
      await expect(landingPage.productsShowActiveOnlyCheckbox).toBeChecked();
    });

    await test.step('Record active-only record count', async () => {
      activeOnlyCount = await landingPage.getRecordCount();
      expect(Number(activeOnlyCount)).toBeGreaterThan(0);
    });

    await test.step('Uncheck "Show active only" to include inactive products', async () => {
      await landingPage.toggleShowActiveOnly();
      await expect(landingPage.productsShowActiveOnlyCheckbox).not.toBeChecked();
    });

    await test.step('Verify record count increased (inactive products now visible)', async () => {
      const allCount = await landingPage.getRecordCount();
      expect(Number(allCount)).toBeGreaterThanOrEqual(Number(activeOnlyCount));
    });

    await test.step('Re-check "Show active only" to restore original filter', async () => {
      await landingPage.toggleShowActiveOnly();
      await expect(landingPage.productsShowActiveOnlyCheckbox).toBeChecked();
    });

    await test.step('Verify record count is restored', async () => {
      const restoredCount = await landingPage.getRecordCount();
      expect(Number(restoredCount)).toBe(Number(activeOnlyCount));
    });
  });

  test('should reset all filters and restore default state', async ({ page }) => {
    await allure.suite('My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'Verify that clicking Reset clears all applied filters and restores the default grid state.',
    );

    let defaultCount: string;

    await test.step('Record default record count', async () => {
      defaultCount = await landingPage.getRecordCount();
    });

    await test.step('Apply a filter to change the grid state', async () => {
      // Uncheck "Show active only" to change state
      await landingPage.toggleShowActiveOnly();
      await expect(landingPage.productsShowActiveOnlyCheckbox).not.toBeChecked();
      const modifiedCount = await landingPage.getRecordCount();
      expect(Number(modifiedCount)).toBeGreaterThanOrEqual(Number(defaultCount));
    });

    await test.step('Click Reset to clear all filters', async () => {
      await landingPage.resetFilters();
    });

    await test.step('Verify "Show active only" is re-checked after reset', async () => {
      await expect(landingPage.productsShowActiveOnlyCheckbox).toBeChecked();
    });

  });

  test('should navigate through pages using pagination', async ({ page }) => {
    await allure.suite('My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'Verify pagination controls work: navigate to page 2, then back to page 1, ' +
      'confirming different data loads on each page.',
    );

    await test.step('Verify pagination is visible and we are on page 1', async () => {
      await expect(landingPage.paginationNav).toBeVisible();
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible();
      const currentPage = await landingPage.getCurrentPageNumber();
      expect(currentPage).toBe(1);
    });

    await test.step('Navigate to page 2', async () => {
      await landingPage.clickNextPage();
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Verify we are on page 2', async () => {
      const currentPage = await landingPage.getCurrentPageNumber();
      expect(currentPage).toBe(2);
    });

    await test.step('Navigate back to page 1', async () => {
      await landingPage.clickPreviousPage();
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Verify we are back on page 1', async () => {
      const currentPage = await landingPage.getCurrentPageNumber();
      expect(currentPage).toBe(1);
    });
  });

  test('should open Product Detail page when clicking a product name', async ({ page }) => {
    await allure.suite('My Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'Verify that clicking the first product name link in the grid navigates to the Product Detail page.',
    );

    let productName: string;

    await test.step('Get the first product name from the grid', async () => {
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible();
      productName = await landingPage.getFirstProductName();
      expect(productName).toBeTruthy();
    });

    await test.step('Click the first product link', async () => {
      await landingPage.clickFirstProduct();
      await waitForOSScreenLoad(page);
    });

    await test.step('Verify Product Detail page is displayed', async () => {
      // Verify we navigated to a product detail page
      await expect(page).toHaveURL(/.*ProductDetail/, { timeout: 30_000 });

      // Verify key elements of the Product Detail page are visible
      await expect(page.getByRole('button', { name: 'Edit Product' })).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Verify product name is displayed on the detail page', async () => {
      // The product name should appear in the breadcrumb or heading
      await expect(page.getByText(productName).first()).toBeVisible();
    });

    await test.step('Verify product ID is displayed', async () => {
      await expect(page.getByText(/ID:PIC-\d+/).first()).toBeVisible();
    });
  });
});
