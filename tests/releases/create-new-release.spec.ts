import { test } from '../../src/fixtures';
import type { Page } from '@playwright/test';
import type { LandingPage } from '../../src/pages';
import * as allure from 'allure-js-commons';

async function findProductReadyForReleaseCreation(
  page: Page,
  landingPage: LandingPage,
  maxProductsToCheck = 10,
): Promise<{ productName: string; productUrl: string }> {
  for (let index = 0; index < maxProductsToCheck; index++) {
    await landingPage.goto();
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    await landingPage.clickTab('My Products');

    const grid = landingPage.grid;
    const firstDataRow = grid.getByRole('row').nth(1);
    await firstDataRow.waitFor({ state: 'visible', timeout: 30_000 });

    const rows = grid.getByRole('row');
    if (index + 1 >= await rows.count()) {
      break;
    }

    const productLink = rows.nth(index + 1).getByRole('link').first();
    const productName = (await productLink.textContent())?.trim() ?? `product-${index + 1}`;
    await productLink.click();

    await page.getByRole('button', { name: 'Edit Product' }).waitFor({ state: 'visible', timeout: 60_000 });
    await page.getByRole('tab', { name: 'Releases' }).click();
    await page.getByRole('button', { name: 'Create Release' }).waitFor({ state: 'visible', timeout: 30_000 });

    const hasNoReleasesMessage = await page.getByText('No releases were created yet!').isVisible().catch(() => false);
    if (!hasNoReleasesMessage) {
      continue;
    }

    return {
      productName,
      productUrl: page.url(),
    };
  }

  throw new Error('No product without releases was found in the first 10 My Products rows.');
}

test.describe.serial('Releases - Create New Release (PIC-100) @regression', () => {
  test.setTimeout(360_000);

  let productUrl: string;
  let productName: string;

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  test('should show required validation when trying to create the first release without mandatory fields', async ({ page, landingPage, newProductPage }) => {
    await allure.suite('Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'RELEASE-CREATE-001: Verify that a product with no releases shows the empty releases state and that the create release popup validates mandatory fields.',
    );

    await test.step('Find a product with no releases from My Products', async () => {
      const product = await findProductReadyForReleaseCreation(page, landingPage);
      productUrl = product.productUrl;
      productName = product.productName;
    });

    await test.step('Verify Releases tab shows the empty state', async () => {
      await newProductPage.expectNoReleasesStateVisible();
    });

    await test.step('Open Create Release popup', async () => {
      await newProductPage.clickCreateRelease();
      await newProductPage.expectCreateReleaseDialogVisible();
    });

    await test.step('Submit without filling mandatory fields', async () => {
      await newProductPage.clickCreateAndScope();
    });

    await test.step('Verify popup validation feedback appears', async () => {
      await newProductPage.expectCreateReleaseValidation();
    });
  });

  test('should create the first release for a product without releases', async ({ page, landingPage, newProductPage }) => {
    await allure.suite('Releases');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description(
      'RELEASE-CREATE-002: Verify that a first release can be created from the Releases tab for a product that currently has no releases.',
    );

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const releaseVersion = `PIC100-${Date.now()}`;

    await test.step('Navigate back to the product Releases tab', async () => {
      if (!productUrl) {
        const product = await findProductReadyForReleaseCreation(page, landingPage);
        productUrl = product.productUrl;
        productName = product.productName;
      }

      await page.goto(productUrl);
      await newProductPage.expectProductDetailLoaded();
      await newProductPage.clickReleasesTab();
      await newProductPage.expectNoReleasesStateVisible();
    });

    await test.step('Open Create Release popup and fill mandatory fields', async () => {
      await newProductPage.clickCreateRelease();
      await newProductPage.createFirstRelease({
        releaseVersion,
        targetDate,
        changeSummary: `Automated release creation for ${productName}`,
      });
    });

    await test.step('Verify the new release is listed in Releases grid with Scoping status', async () => {
      await newProductPage.expectReleaseListed(releaseVersion, 'Scoping');
    });
  });
});