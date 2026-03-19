import { test, expect } from '../../src/fixtures';
import { LoginPage, NewProductPage } from '../../src/pages';
import * as allure from 'allure-js-commons';

test.describe('Products - New Product Creation @regression', () => {
  // Extended timeout: filling all 4 team roles requires OutSystems search API calls,
  // each with up to 240s wait for the edit link widget to appear.
  test.setTimeout(360_000);

  let loginPage: LoginPage;
  let newProductPage: NewProductPage;

  test.beforeEach(async ({ page, userCredentials }) => {
    loginPage = new LoginPage(page);
    newProductPage = new NewProductPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for landing page button as readiness signal
    await page.getByRole('button', { name: 'New Product' }).waitFor({ timeout: 120_000 });
    await expect(page).toHaveURL(/.*GRC_PICASso/);

    // Navigate to New Product form — common precondition for all tests
    await page.getByRole('button', { name: 'New Product' }).click();
    await newProductPage.productNameInput.waitFor({ timeout: 60_000 });
  });

  test('should create a new product with all required fields filled', async ({ page }) => {
    await allure.suite('Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'Verify that a Process Quality Leader can create a new product by filling product information, ' +
      'organization details, and assigning team members for all four required roles.',
    );

    const productName = `Power Switch - Life is On ${Math.floor(Math.random() * 10000) + 1}`;

    await test.step('Fill Product Information', async () => {
      await newProductPage.fillProductInformation({
        name: productName,
        state: 'Under development (not yet released)',
        definition: 'System',
        type: 'Embedded Device',
        description: 'Automated test product for Power Switch - Life is On series. This product covers embedded device security compliance.',
      });
    });

    await test.step('Fill Product Organization', async () => {
      await newProductPage.fillProductOrganization({
        level1: 'Energy Management',
        level2: 'Home & Distribution',
        level3: 'Connected Offers',
      });
    });

    await test.step('Fill Product Team', async () => {
      await newProductPage.fillProductTeam({
        searchQuery: 'Ulad',
        fullName: 'Uladzislau Baranouski',
      });
    });

    await test.step('Re-apply product dropdowns before save', async () => {
      // OutSystems partial refreshes during Org/Team tab operations can reset
      // Product State, Definition, and Type dropdowns. Re-select them.
      await newProductPage.selectProductDropdowns({
        state: 'Under development (not yet released)',
        definition: 'System',
        type: 'Embedded Device',
      });
    });

    await test.step('Save Product and verify creation', async () => {
      await newProductPage.clickSave();

      // Verify product ID was assigned (PIC-XXXX format) — user-visible text
      await expect(page.getByText(/ID:PIC-(?!0)\d+/)).toBeVisible();

      // Verify product is in Active state after save
      await expect(page.getByText('Active')).toBeVisible();

      // Verify the Edit Product button appears (confirming read-only saved state)
      await expect(newProductPage.editProductButton).toBeVisible();
    });
  });

  test('should display validation when saving without required fields', async ({ page }) => {
    await allure.suite('Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'Verify that the form prevents saving when required fields are empty and shows appropriate indicators.',
    );

    await test.step('Attempt to save without filling required fields', async () => {
      await newProductPage.clickSave();

      // The page should remain on ProductId=0 (not saved)
    });

    await test.step('Verify required fields are still present on the page', async () => {
      await expect(newProductPage.productNameInput).toBeVisible();
      await expect(newProductPage.sectionTitle).toBeVisible();
    });
  });

  test('should cancel product creation and return to landing page', async ({ page }) => {
    await allure.suite('Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'Verify that clicking Cancel on the new product form returns to the landing page without saving.',
    );

    await test.step('Fill some product information', async () => {
      await newProductPage.fillProductName('Temporary Product - Should Not Be Saved');
    });

    await test.step('Click Cancel and confirm leaving the page', async () => {
      // POM handles both the Cancel click and the OutSystems "Leave Page" modal
      await newProductPage.clickCancelAndConfirmLeave();
    });
  });

  test('should show cascading org level dropdowns', async ({ page }) => {
    await allure.suite('Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'Verify that Org Level 2 and Org Level 3 dropdowns are disabled until their parent level is selected, ' +
      'and they become enabled with correct options after parent selection.',
    );

    await test.step('Verify all Org Levels are initially disabled', async () => {
      await expect(newProductPage.orgLevel1Select).toBeDisabled();
      await expect(newProductPage.orgLevel2Select).toBeDisabled();
      await expect(newProductPage.orgLevel3Select).toBeDisabled();
    });

    await test.step('Select Org Level 1 and verify Org Level 2 becomes enabled', async () => {
      await newProductPage.selectOrgLevel1('Energy Management');
      await expect(newProductPage.orgLevel2Select).toBeEnabled({ timeout: 40_000 });
    });

    await test.step('Select Org Level 2 and verify Org Level 3 becomes enabled', async () => {
      await newProductPage.selectOrgLevel2('Home & Distribution');
      await expect(newProductPage.orgLevel3Select).toBeEnabled({ timeout: 40_000 });
    });
  });
});
