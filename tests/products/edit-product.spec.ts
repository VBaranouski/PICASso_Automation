import { test } from '../../src/fixtures';
import type { Page } from '@playwright/test';
import type { LandingPage, NewProductPage } from '../../src/pages';
import * as allure from 'allure-js-commons';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createEditableProduct(
  landingPage: LandingPage,
  newProductPage: NewProductPage,
): Promise<{
  productName: string;
  originalProductName: string;
  originalCommercialRef: string;
  productState: string;
  productDefinition: string;
  productType: string;
}> {
  const productState = 'Under development (not yet released)';
  const productDefinition = 'System';
  const productType = 'Embedded Device';
  const productName = `Power Switch - Edit Flow ${Date.now()}`;
  const originalCommercialRef = `AUTO-BASE-${Date.now()}`;

  await landingPage.clickNewProduct();
  await newProductPage.expectNewProductFormLoaded();

  await newProductPage.fillProductInformation({
    name: productName,
    state: productState,
    definition: productDefinition,
    type: productType,
    description: 'Automation-created product for PIC-108 and PIC-109 edit coverage.',
  });
  await newProductPage.fillCommercialRefNumber(originalCommercialRef);

  await newProductPage.fillProductOrganization({
    level1: 'Energy Management',
    level2: 'Home & Distribution',
    level3: 'Connected Offers',
  });

  await newProductPage.fillProductTeam({
    searchQuery: 'Ulad',
    fullName: 'Uladzislau Baranouski',
  });

  await newProductPage.selectProductDropdowns({
    state: productState,
    definition: productDefinition,
    type: productType,
  });

  await newProductPage.clickSave();
  await newProductPage.expectProductSaved();

  return {
    productName,
    originalProductName: productName,
    originalCommercialRef,
    productState,
    productDefinition,
    productType,
  };
}

async function openCreatedProductFromMyProducts(
  landingPage: LandingPage,
  newProductPage: NewProductPage,
  productName: string,
): Promise<void> {
  await landingPage.openMyProductsTab();
  await landingPage.searchAndSelectProductByName(productName, new RegExp(escapeRegExp(productName)));
  await landingPage.expectGridHasRows();
  await landingPage.clickProductAtRow(1);
  await newProductPage.expectProductDetailLoaded();
}

test.describe.serial('Products - Edit Existing Product (PIC-108, PIC-109) @regression', () => {
  test.setTimeout(240_000);

  let productUrl: string;
  let originalProductName: string;
  let originalCommercialRef: string;
  let updatedProductName: string;
  let updatedCommercialRef: string;
  let productState: string;
  let productDefinition: string;
  let productType: string;

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  test('should edit an existing product from My Products and save changes', async ({ page, landingPage, newProductPage }) => {
    await allure.suite('Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.tag('PIC-108');
    await allure.description(
      'PRODUCT-EDIT-001: Starting from Home Page > My Products, open an editable product, update core fields, save, and verify the changes persist.',
    );

    await test.step('Create a valid product that can be edited', async () => {
      const editableProduct = await createEditableProduct(landingPage, newProductPage);
      originalProductName = editableProduct.originalProductName;
      originalCommercialRef = editableProduct.originalCommercialRef;
      productState = editableProduct.productState;
      productDefinition = editableProduct.productDefinition;
      productType = editableProduct.productType;

      updatedProductName = `${editableProduct.productName} - Edited ${Date.now()}`;
      updatedCommercialRef = `AUTO-EDIT-${Date.now()}`;
    });

    await test.step('Open the created product from Home Page > My Products', async () => {
      await openCreatedProductFromMyProducts(landingPage, newProductPage, originalProductName);
      productUrl = page.url();
      await newProductPage.clickEditProductAndWaitForForm();
    });

    await test.step('Update product fields in edit mode', async () => {
      await newProductPage.fillProductName(updatedProductName);
      await newProductPage.fillCommercialRefNumber(updatedCommercialRef);
      await newProductPage.fillProductTeam({
        searchQuery: 'Ulad',
        fullName: 'Uladzislau Baranouski',
      });
      await newProductPage.selectProductDropdowns({
        state: productState,
        definition: productDefinition,
        type: productType,
      });
    });

    await test.step('Save product changes', async () => {
      await newProductPage.clickSave();
      await newProductPage.expectProductSaved();
    });

    await test.step('Re-open edit mode and verify saved values persist', async () => {
      await newProductPage.clickEditProductAndWaitForForm();
      await newProductPage.expectProductNameValue(updatedProductName);
      await newProductPage.expectCommercialRefNumberValue(updatedCommercialRef);
    });
  });

  test('should discard unsaved existing-product changes when canceling edit mode', async ({ landingPage, newProductPage }) => {
    await allure.suite('Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.tag('PIC-109');
    await allure.description(
      'PRODUCT-EDIT-002: Starting from Home Page > My Products, open the same editable product, make temporary changes, cancel edit mode, and verify unsaved values are discarded.',
    );

    const unsavedProductName = `${updatedProductName} - Cancelled`;
    const unsavedCommercialRef = `${updatedCommercialRef}-TMP`;

    await test.step('Open the edited product again and enter edit mode', async () => {
      await openCreatedProductFromMyProducts(landingPage, newProductPage, updatedProductName);
      await newProductPage.clickEditProductAndWaitForForm();
    });

    await test.step('Apply temporary changes without saving', async () => {
      await newProductPage.fillProductName(unsavedProductName);
      await newProductPage.fillCommercialRefNumber(unsavedCommercialRef);
    });

    await test.step('Cancel edit mode and confirm leaving the page', async () => {
      await newProductPage.clickCancelAndConfirmLeave();
    });

    await test.step('Re-open the product and verify unsaved changes were discarded', async () => {
      await openCreatedProductFromMyProducts(landingPage, newProductPage, updatedProductName);
      await newProductPage.clickEditProductAndWaitForForm();
      await newProductPage.expectProductNameValue(updatedProductName);
      await newProductPage.expectCommercialRefNumberValue(updatedCommercialRef);
    });

    await test.step('Restore original product values as cleanup', async () => {
      await newProductPage.fillProductName(originalProductName);
      await newProductPage.fillCommercialRefNumber(originalCommercialRef);
      await newProductPage.fillProductTeam({
        searchQuery: 'Ulad',
        fullName: 'Uladzislau Baranouski',
      });
      await newProductPage.selectProductDropdowns({
        state: productState,
        definition: productDefinition,
        type: productType,
      });
      await newProductPage.clickSave();
      await newProductPage.expectProductSaved();
    });

    await test.step('Verify original values are restored', async () => {
      await newProductPage.clickEditProductAndWaitForForm();
      await newProductPage.expectProductNameValue(originalProductName);
      await newProductPage.expectCommercialRefNumberValue(originalCommercialRef);
    });
  });
});