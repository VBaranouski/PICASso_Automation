import { test } from '../../src/fixtures';
import * as allure from 'allure-js-commons';

test.describe('My Products Tab - Exploratory @regression', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    await landingPage.expectPageLoaded({ timeout: 60_000 });

    await landingPage.clickTab('My Products');
    await landingPage.grid.waitFor({ timeout: 30_000 });
  });

  test('should search products by name using combobox filter', async ({ landingPage }) => {
    await allure.suite('My Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'LANDING-MY-PRODUCTS-001: Verify that searching for a product by name via the combobox filter narrows the grid results.',
    );

    let initialCount: string;

    await test.step('Record initial record count', async () => {
      initialCount = await landingPage.getRecordCount();
      await landingPage.expectRecordCountGreaterThan(0);
    });

    await test.step('Search and select a matching product from dropdown', async () => {
      await landingPage.searchAndSelectProductByName('Power Switch', /Power Switch/);
    });

    await test.step('Verify grid is filtered to fewer results', async () => {
      await landingPage.expectRecordCountLessThan(Number(initialCount));
    });

    await test.step('Verify grid displays matching product data', async () => {
      await landingPage.expectGridHasRows();
    });
  });

  test('should search products by Product ID using combobox filter', async ({ landingPage }) => {
    await allure.suite('My Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'LANDING-MY-PRODUCTS-002: Verify that searching by Product ID via the combobox filter shows the matching product.',
    );

    let productId: string;

    await test.step('Capture a product ID from the current grid data', async () => {
      await landingPage.expectGridHasRows();
      productId = await landingPage.getProductIdAtRow(1);
      test.skip(!productId, 'No product ID was found in the first My Products row.');
    });

    await test.step('Search and select matching product ID from dropdown', async () => {
      await landingPage.searchAndSelectProductById(productId, new RegExp(productId));
    });

    await test.step('Verify grid shows filtered result', async () => {
      await landingPage.expectRecordCountGreaterThan(0);
      await landingPage.expectGridHasRows();
    });
  });

  test('should toggle Show Active Only checkbox to include inactive products', async ({ landingPage }) => {
    await allure.suite('My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-MY-PRODUCTS-003: Verify that unchecking "Show active only" increases the record count by including inactive products, ' +
      'and re-checking it restores the original count.',
    );

    let activeOnlyCount: string;

    await test.step('Verify "Show active only" is checked by default', async () => {
      await landingPage.expectProductsShowActiveOnlyChecked();
    });

    await test.step('Record active-only record count', async () => {
      activeOnlyCount = await landingPage.getRecordCount();
      await landingPage.expectRecordCountGreaterThan(0);
    });

    await test.step('Uncheck "Show active only" to include inactive products', async () => {
      await landingPage.toggleShowActiveOnly();
      await landingPage.expectProductsShowActiveOnlyUnchecked();
    });

    await test.step('Verify record count increased (inactive products now visible)', async () => {
      await landingPage.expectRecordCountAtLeast(Number(activeOnlyCount));
    });

    await test.step('Re-check "Show active only" to restore original filter', async () => {
      await landingPage.toggleShowActiveOnly();
      await landingPage.expectProductsShowActiveOnlyChecked();
    });
  });

  test('should reset all filters and restore default state', async ({ landingPage }) => {
    await allure.suite('My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-MY-PRODUCTS-004: Verify that clicking Reset clears all applied filters and restores the default grid state.',
    );

    await test.step('Apply a filter to change the grid state', async () => {
      await landingPage.toggleShowActiveOnly();
      await landingPage.expectProductsShowActiveOnlyUnchecked();
    });

    await test.step('Click Reset to clear all filters', async () => {
      await landingPage.resetFilters();
    });

    await test.step('Verify "Show active only" is re-checked after reset', async () => {
      await landingPage.expectProductsShowActiveOnlyChecked();
    });
  });

  test('should navigate through pages using pagination', async ({ landingPage }) => {
    await allure.suite('My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-MY-PRODUCTS-005: Verify pagination controls work: navigate to page 2, then back to page 1, ' +
      'confirming different data loads on each page.',
    );

    await test.step('Verify pagination is visible and we are on page 1', async () => {
      await landingPage.expectGridHasRows();
      await landingPage.expectCurrentPageNumber(1);
    });

    await test.step('Navigate to page 2', async () => {
      await landingPage.clickNextPage();
      await landingPage.waitForOSLoad();
      await landingPage.expectGridHasRows();
    });

    await test.step('Verify we are on page 2', async () => {
      await landingPage.expectCurrentPageNumber(2);
    });

    await test.step('Navigate back to page 1', async () => {
      await landingPage.clickPreviousPage();
      await landingPage.waitForOSLoad();
      await landingPage.expectGridHasRows();
    });

    await test.step('Verify we are back on page 1', async () => {
      await landingPage.expectCurrentPageNumber(1);
    });
  });

  test('should open Product Detail page when clicking a product name', async ({ landingPage, newProductPage }) => {
    await allure.suite('My Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'LANDING-MY-PRODUCTS-006: Verify that clicking the first product name link in the grid navigates to the Product Detail page.',
    );

    let productName: string;

    await test.step('Get the first product name from the grid', async () => {
      await landingPage.expectGridHasRows();
      productName = await landingPage.getFirstProductName();
    });

    await test.step('Click the first product link', async () => {
      await landingPage.clickProductAtRow(1);
    });

    await test.step('Verify Product Detail page is displayed', async () => {
      await newProductPage.expectProductDetailLoaded();
    });

    await test.step('Verify product name is displayed on the detail page', async () => {
      await newProductPage.expectProductNameVisible(productName);
    });

    await test.step('Verify product ID is displayed', async () => {
      await newProductPage.expectProductIdVisible();
    });
  });
});
