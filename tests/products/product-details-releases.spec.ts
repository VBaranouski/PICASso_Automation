import { test } from '../../src/fixtures';
import * as allure from 'allure-js-commons';

/**
 * Product Detail — Releases Tab (P1 Placeholders)
 *
 * Stories: PIC-108, PIC-110
 *
 * These scenarios cover Releases tab behavior on the Product Detail page:
 * - Viewing existing releases in the grid
 * - Creating a new release with validation
 * - Release version format and date selection
 *
 * Status: placeholder — not yet implemented, marked with test.fixme.
 */

test.describe('Product Details - Releases Tab @regression @placeholder', () => {
  test.setTimeout(240_000);

  test.beforeEach(async ({ loginPage, userCredentials, page }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  test.fixme('should display releases grid for a product with existing releases', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Releases');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.tag('PIC-110');
    await allure.description(
      'PRODUCT-RELEASES-001: Navigate to a product that has releases, switch to the Releases tab, ' +
      'and verify the releases grid shows at least one row with release version and status.',
    );

    // TODO: Implement — navigate to product with existing releases
    // await landingPage.openMyProductsTab();
    // await landingPage.clickProductAtRow(N); // product with known releases
    // await newProductPage.expectProductDetailLoaded();
    // await newProductPage.clickReleasesTab();
    // await newProductPage.expectNoReleasesStateHidden();
    // await newProductPage.releasesGrid.waitFor({ state: 'visible' });
  });

  test.fixme('should show no-releases empty state for a product without releases', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-110');
    await allure.description(
      'PRODUCT-RELEASES-002: Navigate to a product without releases, switch to the Releases tab, ' +
      'and verify the "No releases were created yet!" message and Create Release button are displayed.',
    );

    // TODO: Implement
    // await landingPage.openMyProductsTab();
    // await landingPage.clickProductAtRow(N); // product without releases
    // await newProductPage.expectProductDetailLoaded();
    // await newProductPage.clickReleasesTab();
    // await newProductPage.expectNoReleasesStateVisible();
  });

  test.fixme('should validate required fields when creating a release without filling them', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-108');
    await allure.description(
      'PRODUCT-RELEASES-003: Open the Create Release dialog, click Create & Scope without filling fields, ' +
      'and verify validation messages appear for Release Version, Target Date, and Change Summary.',
    );

    // TODO: Implement
    // await landingPage.openMyProductsTab();
    // await landingPage.clickProductAtRow(1);
    // await newProductPage.clickReleasesTab();
    // await newProductPage.clickCreateRelease();
    // await newProductPage.expectCreateReleaseDialogVisible();
    // await newProductPage.clickCreateAndScope();
    // await newProductPage.expectCreateReleaseValidation();
  });

  test.fixme('should create a new release and verify it appears in the grid', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products - Releases');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.tag('PIC-108');
    await allure.description(
      'PRODUCT-RELEASES-004: Create a new release with valid data and verify it appears in the releases grid ' +
      'with the correct version and an appropriate initial status.',
    );

    // TODO: Implement
    // const releaseVersion = `1.0.${Date.now() % 10000}`;
    // await landingPage.openMyProductsTab();
    // await landingPage.clickProductAtRow(1);
    // await newProductPage.clickReleasesTab();
    // await newProductPage.clickCreateRelease();
    // await newProductPage.createFirstRelease({
    //   releaseVersion,
    //   targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    //   changeSummary: 'Automated release creation test',
    // });
    // await newProductPage.expectReleaseListed(releaseVersion, 'Active');
  });
});
