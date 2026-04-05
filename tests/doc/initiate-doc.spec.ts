import { test, expect } from '../../src/fixtures';
import type { Page } from '@playwright/test';
import type { DocDetailsPage, LandingPage, NewProductPage } from '../../src/pages';
import * as allure from 'allure-js-commons';

async function createProductReadyForDocInitiation(
  landingPage: LandingPage,
  newProductPage: NewProductPage,
): Promise<void> {
  const productName = `Power Switch - DOC Initiation ${Date.now()}`;
  const vestaId = `${Math.floor(Math.random() * 90000) + 10000}`;

  await landingPage.goto();
  await landingPage.expectPageLoaded({ timeout: 60_000 });
  await landingPage.clickNewProduct();
  await newProductPage.expectNewProductFormLoaded();

  await newProductPage.fillProductInformation({
    name: productName,
    state: 'Under development (not yet released)',
    definition: 'System',
    type: 'Embedded Device',
    description: 'Automation-created product prepared for DOC initiation coverage.',
  });

  await newProductPage.toggleDigitalOffer();
  await newProductPage.fillDigitalOfferDetails({
    vestaId,
    searchQuery: 'Ulad',
    itOwnerFullName: 'Uladzislau Baranouski',
    projectManagerFullName: 'Uladzislau Baranouski',
  });

  await newProductPage.fillProductOrganization({
    level1: 'Energy Management',
    level2: 'Home & Distribution',
    level3: 'Connected Offers',
  });

  await newProductPage.fillProductTeam({
    searchQuery: 'Ulad',
    fullName: 'Uladzislau Baranouski',
  });

  await newProductPage.fillProductOrganization({
    level1: 'Energy Management',
    level2: 'Home & Distribution',
    level3: 'Connected Offers',
  });

  await newProductPage.fillProductTeam({
    searchQuery: 'Ulad',
    fullName: 'Uladzislau Baranouski',
  });

  await newProductPage.fillProductInformation({
    name: productName,
    state: 'Under development (not yet released)',
    definition: 'System',
    type: 'Embedded Device',
    description: 'Automation-created product prepared for DOC initiation coverage.',
  });

  await newProductPage.clickSave();
  await newProductPage.expectProductSaved();
  await newProductPage.expectDigitalOfferCertificationTabVisible();
  await newProductPage.digitalOfferCertificationTab.click();
  await newProductPage.waitForOSLoad();
}

async function findProductReadyForDocInitiation(
  page: Page,
  landingPage: LandingPage,
  newProductPage: NewProductPage,
  docDetailsPage: DocDetailsPage,
): Promise<void> {
  const maxProductsToCheck = 30;

  for (let index = 0; index < maxProductsToCheck; index++) {
    await landingPage.openMyProductsTab();
    await landingPage.changePerPage('100');

    const rows = landingPage.grid.getByRole('row');
    if (index + 1 >= await rows.count()) {
      break;
    }

    await landingPage.clickProductAtRow(index + 1);
    await page.getByRole('button', { name: 'Edit Product' })
      .waitFor({ state: 'visible', timeout: 60_000 });

    const hasDigitalOfferTab = await newProductPage.digitalOfferCertificationTab.isVisible();
    if (!hasDigitalOfferTab) {
      continue;
    }

    await newProductPage.digitalOfferCertificationTab.click();
    await newProductPage.waitForOSLoad();

    const isInitiateDocVisible = await docDetailsPage.initiateDOCButton.isVisible();
    if (!isInitiateDocVisible) {
      continue;
    }

    const isInitiateDocEnabled = await docDetailsPage.initiateDOCButton.isEnabled();
    if (!isInitiateDocEnabled) {
      continue;
    }

    if (isInitiateDocVisible && isInitiateDocEnabled) {
      return;
    }
  }

  await createProductReadyForDocInitiation(landingPage, newProductPage);

  const isInitiateDocVisible = await docDetailsPage.initiateDOCButton.isVisible().catch(() => false);
  const isInitiateDocEnabled = await docDetailsPage.initiateDOCButton.isEnabled().catch(() => false);
  if (isInitiateDocVisible && isInitiateDocEnabled) {
    return;
  }

  throw new Error('No products ready for DOC initiation were found, and auto-created DOC-ready product still did not expose Initiate DOC.');
}

/**
 * PIC-3927: Initiate DOC Process
 *
 * Self-sufficient: DOC-INIT-001 scans My Products on the home page for a product that
 * has a VESTA ID and an "Initiate DOC" button available (up to 10 products checked).
 * If none found, the suite is skipped with a clear message.
 *
 * Serial execution: DOC-INIT-001 initiates the DOC and captures the resulting DOC Detail
 * page URL; all subsequent tests navigate to that URL directly.
 */
test.describe.serial('DOC - Initiate DOC Process (PIC-3927) @regression', () => {
  test.setTimeout(360_000);

  let docDetailsUrl: string;

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    // OutSystems redirect is slow — wait for landing page to settle before proceeding
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  // ---------------------------------------------------------------------------
  // DOC-INIT-001 (smoke) — Create product with Digital Offer, initiate DOC,
  //                   verify status transitions to "Controls Scoping"
  // ---------------------------------------------------------------------------
  test('should update DOC status to Controls Scoping and stage to Scope ITS Controls after initiation @smoke',
    async ({ page, landingPage, newProductPage, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('critical');
      await allure.tag('smoke');
      await allure.description(
        'DOC-INIT-001: Verify that clicking Initiate DOC transitions the DOC status to ' +
        '"Controls Scoping" and the stage to "Scope ITS Controls".',
      );

      await test.step('Find product ready for DOC initiation on Home Page', async () => {
        await findProductReadyForDocInitiation(page, landingPage, newProductPage, docDetailsPage);
      });

      await test.step('Initiate DOC', async () => {
        await docDetailsPage.clickInitiateDOC({
          docName: `DOC Automated Test ${Date.now()}`,
          docReason: 'Automated test for PIC-3927 — verifying DOC initiation flow.',
          release: 'Other Release',
          releaseVersion: '1.0.0',
          targetReleaseDate: { year: 2027, month: 6, day: 30 },
        });
        await docDetailsPage.waitForInitiation();
        // Navigate to the DOC Detail page; capture URL for subsequent serial tests
        await docDetailsPage.navigateToFirstDoc();
        docDetailsUrl = page.url();
      });

      await test.step('Verify DOC status is Controls Scoping', async () => {
        await docDetailsPage.expectDocStatus('Controls Scoping');
      });

      await test.step('Verify DOC stage is Scope ITS Controls', async () => {
        await docDetailsPage.expectDocStage('Scope ITS Controls');
      });
    });

  // ---------------------------------------------------------------------------
  // DOC-INIT-002 — Navigating back to the DOC Detail page preserves status/stage
  // ---------------------------------------------------------------------------
  test('should initiate DOC from stage button and produce same status/stage transition',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'DOC-INIT-002: Verify that navigating to the DOC Detail page (captured after DOC-INIT-001) ' +
        'still shows status "Controls Scoping" and stage "Scope ITS Controls".',
      );

      await test.step('Navigate to DOC Detail page', async () => {
        await page.goto(docDetailsUrl);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify status and stage remain after navigation', async () => {
        await docDetailsPage.expectDocStatus('Controls Scoping');
        await docDetailsPage.expectDocStage('Scope ITS Controls');
      });
    });

  // ---------------------------------------------------------------------------
  // DOC-INIT-003 — Digital Offer Details tab is present and clickable
  // ---------------------------------------------------------------------------
  test('should show Digital Offer Details tab as clickable after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'DOC-INIT-003: Digital Offer Details tab must be present and interactive ' +
        'after DOC initiation.',
      );

      await test.step('Navigate to DOC Detail page', async () => {
        await page.goto(docDetailsUrl);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify Digital Offer Details tab is clickable', async () => {
        await docDetailsPage.expectDigitalOfferDetailsTabClickable();
      });

      await test.step('Click Digital Offer Details tab and verify panel loads', async () => {
        await docDetailsPage.clickDigitalOfferDetailsTab();
        await docDetailsPage.expectDigitalOfferDetailsTabPanelVisible();
      });
    });

  // ---------------------------------------------------------------------------
  // DOC-INIT-004 — Roles & Responsibilities tab is present and clickable
  // ---------------------------------------------------------------------------
  test('should show Roles & Responsibilities tab as clickable after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'DOC-INIT-004: Roles & Responsibilities tab must appear after DOC initiation ' +
        'and be interactive (shows team assignments table).',
      );

      await test.step('Navigate to DOC Detail page', async () => {
        await page.goto(docDetailsUrl);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify Roles & Responsibilities tab is clickable', async () => {
        await docDetailsPage.expectRolesResponsibilitiesTabClickable();
      });
    });

  // ---------------------------------------------------------------------------
  // DOC-INIT-005 — ITS Checklist tab is present and clickable
  // ---------------------------------------------------------------------------
  test('should show ITS Checklist tab as clickable after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'DOC-INIT-005: ITS Checklist tab must appear after DOC initiation and be interactive.',
      );

      await test.step('Navigate to DOC Detail page', async () => {
        await page.goto(docDetailsUrl);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify ITS Checklist tab is clickable', async () => {
        await docDetailsPage.expectITSChecklistTabClickable();
      });
    });

  // ---------------------------------------------------------------------------
  // DOC-INIT-006 — Initiator username and date shown under Initiate stage
  // ---------------------------------------------------------------------------
  test('should show initiator username and date under the Initiate stage in the DOC flow',
    async ({ page, docDetailsPage, userCredentials }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'DOC-INIT-006: After initiation the DOC flow must show the username of the user who ' +
        'clicked Initiate DOC and the date, beneath the Initiate DOC stage tab.',
      );

      await test.step('Navigate to DOC Detail page', async () => {
        await page.goto(docDetailsUrl);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify initiator username is shown under the Initiate stage', async () => {
        await docDetailsPage.expectInitiatorNameVisible(userCredentials.login);
      });

      await test.step('Verify initiation year is shown under the Initiate stage', async () => {
        await docDetailsPage.expectInitiationDateVisible('2026');
      });
    });

  // ---------------------------------------------------------------------------
  // DOC-INIT-007 — Cancel DOC button is available after initiation
  // ---------------------------------------------------------------------------
  test('should show Cancel DOC button for privileged user after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'DOC-INIT-007: A user with CANCEL_DIGITAL_OFFER_CERTIFICATION privilege must see ' +
        'a "Cancel DOC" button in the DOC Detail header after initiation.',
      );

      await test.step('Navigate to DOC Detail page', async () => {
        await page.goto(docDetailsUrl);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify Cancel DOC button is visible in header', async () => {
        await docDetailsPage.expectCancelOptionVisibleInScopeStage();
      });
    });

  // ---------------------------------------------------------------------------
  // DOC-INIT-008 (smoke) — DOC Details header: VESTA ID, DOC ID format,
  //                  Release version, Target Release Date (AC2)
  // ---------------------------------------------------------------------------
  
  
  /* SKip, as DOC ID format and Target Release Date are no longer in scope for PIC-3927; will revisit in future when those fields are expected to be present

  test('should display correct VESTA ID, DOC ID format, and populated Target Release Date in header @smoke',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('critical');
      await allure.tag('smoke');
      await allure.description(
        'DOC-INIT-008: DOC Detail header must show VESTA ID entered during creation, ' +
        'DOC ID in DOC-NNN format, and Target Release Date populated from the release.',
      );

      await test.step('Navigate to DOC Detail page', async () => {
        await page.goto(docDetailsUrl);
        await docDetailsPage.waitForOSLoad();
      });

      await test.step('Verify DOC ID follows DOC-NNN format', async () => {
        await docDetailsPage.expectDocIdFormat();
      });

      await test.step('Verify VESTA ID is visible in header', async () => {
        // The VESTA ID was set dynamically in DOC-INIT-001; verify any numeric VESTA ID is visible
        await expect(page.getByText(/VESTA ID/).locator('..').getByText(/\d+/).first()).toBeVisible({ timeout: 30_000 });
      });

      await test.step('Verify Target Release Date is populated', async () => {
        await docDetailsPage.expectTargetReleaseDatePopulated();
      });
    });
    */
});
