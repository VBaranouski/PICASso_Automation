import { test } from '../../src/fixtures';
import * as allure from 'allure-js-commons';

/**
 * Product Details Page — P0 Regression Suite
 *
 * Stories: PIC-108, PIC-109, PIC-110
 *
 * Covers view-mode detail assertions, edit-mode validation,
 * Reset Form behavior, description persistence, and checkbox toggles.
 *
 * All tests start from Home Page > My Products > open first product.
 */

test.describe.serial('Product Details Page (PIC-108, PIC-109, PIC-110) @regression', () => {
  test.setTimeout(240_000);

  let productName: string;
  let productUrl: string;

  test.beforeEach(async ({ loginPage, userCredentials, page }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  test('should display product detail header with name, ID, status, and action links', async ({ landingPage, newProductPage, page }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.tag('PIC-110');
    await allure.description(
      'PRODUCT-DETAIL-001: Verify Product Detail page header shows product name, PIC-ID, Active status badge, ' +
      'Edit Product button, View History link, and Actions Management link.',
    );

    await test.step('Navigate to My Products and open first product', async () => {
      await landingPage.openMyProductsTab();
      productName = await landingPage.getFirstProductName();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
      productUrl = page.url();
    });

    await test.step('Verify product name in header', async () => {
      await newProductPage.expectProductNameVisible(productName);
    });

    await test.step('Verify product ID format (PIC-XXXX)', async () => {
      await newProductPage.expectProductIdVisible();
    });

    await test.step('Verify Active status badge is displayed', async () => {
      await newProductPage.expectProductStatusBadge('Active');
    });

    await test.step('Verify Edit Product button is visible', async () => {
      await newProductPage.expectProductDetailLoaded();
    });

    await test.step('Verify View History link is visible', async () => {
      await newProductPage.expectViewHistoryLinkVisible();
    });

    await test.step('Verify Actions Management link is visible', async () => {
      await newProductPage.expectActionsManagementLinkVisible();
    });
  });

  test('should display Product Details and bottom section tabs in view mode', async ({ landingPage, newProductPage, page }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.tag('PIC-110');
    await allure.description(
      'PRODUCT-DETAIL-002: Verify view mode shows Product Related Details section, Product Description, ' +
      'and bottom section tabs (Organization, Team, Security Summary, Configuration).',
    );

    await test.step('Navigate to first product detail', async () => {
      await landingPage.openMyProductsTab();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
    });

    await test.step('Verify Product Related Details section title', async () => {
      await newProductPage.sectionTitle.waitFor({ state: 'visible', timeout: 30_000 });
    });

    await test.step('Verify Product Description accordion is visible', async () => {
      await newProductPage.productDescriptionToggle.waitFor({ state: 'visible', timeout: 30_000 });
    });

    await test.step('Verify bottom section tabs are visible', async () => {
      await newProductPage.expectBottomTabsVisible();
    });

    await test.step('Verify Product Details and Releases top tabs exist', async () => {
      await newProductPage.productDetailsTab.waitFor({ state: 'visible', timeout: 30_000 });
      await newProductPage.releasesTab.waitFor({ state: 'visible', timeout: 30_000 });
    });
  });

  test('should show required field validation when clearing Product Name in edit mode', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-108');
    await allure.description(
      'PRODUCT-DETAIL-003: In edit mode, clear the mandatory Product Name field and attempt to save. ' +
      'Verify that the form stays visible and does not navigate away.',
    );

    await test.step('Navigate to first product and enter edit mode', async () => {
      await landingPage.openMyProductsTab();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
      await newProductPage.clickEditProductAndWaitForForm();
    });

    let originalName: string;

    await test.step('Record original product name and clear it', async () => {
      originalName = await newProductPage.getProductNameValue();
      await newProductPage.fillProductName('');
    });

    await test.step('Attempt to save with empty product name', async () => {
      await newProductPage.clickSave();
    });

    await test.step('Verify form remains visible (save blocked)', async () => {
      await newProductPage.expectFormVisible();
    });

    await test.step('Restore original product name and cancel', async () => {
      await newProductPage.fillProductName(originalName);
      await newProductPage.clickCancelAndConfirmLeave();
    });
  });

  test('should restore original values when clicking Reset Form in edit mode', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-109');
    await allure.description(
      'PRODUCT-DETAIL-004: In edit mode, change the product name, click Reset Form, and verify the original ' +
      'value is restored without saving.',
    );

    await test.step('Navigate to first product and enter edit mode', async () => {
      await landingPage.openMyProductsTab();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
      await newProductPage.clickEditProductAndWaitForForm();
    });

    let originalName: string;

    await test.step('Record original product name', async () => {
      originalName = await newProductPage.getProductNameValue();
    });

    await test.step('Change product name to a temporary value', async () => {
      await newProductPage.fillProductName(`Temp Reset Test ${Date.now()}`);
    });

    await test.step('Click Reset Form', async () => {
      await newProductPage.clickResetForm();
    });

    await test.step('Verify product name reverted to original value', async () => {
      await newProductPage.expectProductNameValue(originalName);
    });

    await test.step('Cancel edit mode to clean up', async () => {
      await newProductPage.clickCancel();
    });
  });

  test('should persist updated product description after save', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-108');
    await allure.description(
      'PRODUCT-DETAIL-005: Update the product description in edit mode, save the product, and verify the ' +
      'updated description persists in view mode.',
    );

    const newDescription = `Updated description for automation test - ${Date.now()}`;

    await test.step('Navigate to first product and enter edit mode', async () => {
      await landingPage.openMyProductsTab();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
      await newProductPage.clickEditProductAndWaitForForm();
    });

    let originalDescription: string;

    await test.step('Record original description', async () => {
      originalDescription = await newProductPage.getDescriptionText();
    });

    await test.step('Update product description', async () => {
      // CKEditor requires click + selectAll + type approach instead of fill()
      const editor = newProductPage.productDescriptionEditor;
      await editor.click();
      await editor.press('Meta+a');
      await editor.pressSequentially(newDescription, { delay: 20 });
    });

    await test.step('Save product', async () => {
      await newProductPage.clickSave();
      await newProductPage.expectProductSaved();
    });

    await test.step('Verify updated description in view mode', async () => {
      await newProductPage.expectProductDescriptionContains(newDescription);
    });

    await test.step('Restore original description', async () => {
      await newProductPage.clickEditProductAndWaitForForm();
      const editor = newProductPage.productDescriptionEditor;
      await editor.click();
      await editor.press('Meta+a');
      await editor.pressSequentially(originalDescription, { delay: 20 });
      await newProductPage.clickSave();
      await newProductPage.expectProductSaved();
    });
  });

  test('should toggle and persist Data Protection & Privacy checkbox', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-108');
    await allure.description(
      'PRODUCT-DETAIL-006: Toggle the Data Protection & Privacy checkbox in edit mode, save, and verify ' +
      'the change persists. Then restore the original value.',
    );

    await test.step('Navigate to first product and enter edit mode', async () => {
      await landingPage.openMyProductsTab();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
      await newProductPage.clickEditProductAndWaitForForm();
    });

    let wasChecked: boolean;

    await test.step('Record original Data Protection checkbox state', async () => {
      wasChecked = await newProductPage.isDataProtectionChecked();
    });

    await test.step('Toggle Data Protection checkbox', async () => {
      await newProductPage.toggleDataProtection();
    });

    await test.step('Save product', async () => {
      await newProductPage.clickSaveAndHandleConfirmDialog();
      await newProductPage.expectProductSaved();
    });

    await test.step('Verify Data Protection value changed in view mode', async () => {
      const expectedValue = wasChecked ? 'No' : 'Yes';
      await newProductPage.expectDataProtectionValue(expectedValue);
    });

    await test.step('Restore original Data Protection state', async () => {
      await newProductPage.clickEditProductAndWaitForForm();
      await newProductPage.toggleDataProtection();
      await newProductPage.clickSaveAndHandleConfirmDialog();
      await newProductPage.expectProductSaved();
    });
  });

  test('should toggle and persist Brand Label checkbox', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-108');
    await allure.description(
      'PRODUCT-DETAIL-007: Toggle the Brand Label checkbox in edit mode, save, and verify ' +
      'the change persists. Then restore the original value.',
    );

    await test.step('Navigate to first product and enter edit mode', async () => {
      await landingPage.openMyProductsTab();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
      await newProductPage.clickEditProductAndWaitForForm();
    });

    let wasChecked: boolean;

    await test.step('Record original Brand Label checkbox state', async () => {
      wasChecked = await newProductPage.isBrandLabelChecked();
    });

    await test.step('Toggle Brand Label checkbox', async () => {
      await newProductPage.toggleBrandLabel();
    });

    await test.step('Save product', async () => {
      await newProductPage.clickSaveAndHandleConfirmDialog();
      await newProductPage.expectProductSaved();
    });

    await test.step('Verify Brand Label value changed in view mode', async () => {
      const expectedValue = wasChecked ? 'No' : 'Yes';
      await newProductPage.expectBrandLabelValue(expectedValue);
    });

    await test.step('Restore original Brand Label state', async () => {
      await newProductPage.clickEditProductAndWaitForForm();
      await newProductPage.toggleBrandLabel();
      await newProductPage.clickSaveAndHandleConfirmDialog();
      await newProductPage.expectProductSaved();
    });
  });

  test('should display product organization info in view mode', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Product Details');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-110');
    await allure.description(
      'PRODUCT-DETAIL-008: Verify product organization levels and Cross-Org flag are displayed in view mode ' +
      'under the Product Organization tab.',
    );

    await test.step('Navigate to first product detail', async () => {
      await landingPage.openMyProductsTab();
      await landingPage.clickProductAtRow(1);
      await newProductPage.expectProductDetailLoaded();
    });

    await test.step('Verify Product Organization tab is visible and selected', async () => {
      await newProductPage.productOrganizationTab.waitFor({ state: 'visible', timeout: 30_000 });
    });

    await test.step('Verify Org Level values are displayed', async () => {
      await newProductPage.expectOrgLevelValues({
        level1: 'Energy Management',
        level2: 'Home & Distribution',
        level3: 'Connected Offers',
      });
    });
  });
});
