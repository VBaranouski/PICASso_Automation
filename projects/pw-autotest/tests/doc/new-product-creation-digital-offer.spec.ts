import { test } from '../../src/fixtures';
import * as allure from 'allure-js-commons';

test.describe('Products - New Product Creation with Digital Offer @regression', () => {
  // Extended timeout: filling all 4 team roles requires OutSystems search API calls,
  // each with up to 240s wait for the edit link widget to appear.
  test.setTimeout(360_000);

  test.beforeEach(async ({ loginPage, landingPage, newProductPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for New Product button as readiness signal
    await landingPage.clickNewProduct();
    await newProductPage.expectNewProductFormLoaded();
  });

  test('should create a new product with Digital Offer and verify certification tab appears', async ({ newProductPage }) => {
    await allure.suite('Products');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'Verify that a Process Quality Leader can create a new product with the Digital Offer option enabled, ' +
      'and that the Digital Offer Certification tab appears on the saved product.',
    );

    const productName = `Power Switch - Digital Offer ${Math.floor(Math.random() * 10000) + 1}`;

    await test.step('Fill Product Information', async () => {
      await newProductPage.fillProductInformation({
        name: productName,
        state: 'Under development (not yet released)',
        definition: 'System',
        type: 'Embedded Device',
        description: 'Automated test product with Digital Offer enabled for certification tab verification.',
      });
    });

    await test.step('Enable Digital Offer', async () => {
      await newProductPage.toggleDigitalOffer();
    });

    await test.step('Fill Digital Offer Details', async () => {
      // VESTA ID: 5-digit random number (10000–99999) satisfying the 5–10 digit requirement
      const vestaId = `${Math.floor(Math.random() * 90000) + 10000}`;
      await newProductPage.fillDigitalOfferDetails({
        vestaId,
        searchQuery: 'Ulad',
        itOwnerFullName: 'Uladzislau Baranouski',
        projectManagerFullName: 'Uladzislau Baranouski',
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
      await newProductPage.expectProductSaved();
    });

    await test.step('Verify Digital Offer Certification tab is present', async () => {
      await newProductPage.expectDigitalOfferCertificationTabVisible();
    });
  });
});
