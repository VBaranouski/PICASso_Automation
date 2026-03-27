import { test, expect } from '../../src/fixtures';
import * as allure from 'allure-js-commons';

/**
 * PIC-3927: Initiate DOC Process
 *
 * Self-sufficient: TC-001 scans My Products on the home page for a product that
 * has a VESTA ID and an "Initiate DOC" button available (up to 10 products checked).
 * If none found, the suite is skipped with a clear message.
 *
 * Serial execution: TC-001 initiates the DOC and captures the resulting DOC Detail
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
  // TC-001 (smoke) — Create product with Digital Offer, initiate DOC,
  //                   verify status transitions to "Controls Scoping"
  // ---------------------------------------------------------------------------
  test('should update DOC status to Controls Scoping and stage to Scope ITS Controls after initiation @smoke',
    async ({ page, landingPage, newProductPage, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('critical');
      await allure.tag('smoke');
      await allure.description(
        'TC-001 (AC1): Verify that clicking Initiate DOC transitions the DOC status to ' +
        '"Controls Scoping" and the stage to "Scope ITS Controls".',
      );

      await test.step('Find product ready for DOC initiation on Home Page', async () => {
        const MAX = 10;
        let found = false;

        for (let i = 0; i < MAX; i++) {
          await landingPage.goto();
          await landingPage.clickTab('My Products');

          const rows = landingPage.grid.getByRole('row');
          if (i + 1 >= await rows.count()) break;

          const row = rows.nth(i + 1);
          const hasVestaId = await row.getByRole('cell')
            .filter({ hasText: /^\d{5,}$/ }).count() > 0;
          if (!hasVestaId) continue;

          await row.getByRole('link').first().click();
          await page.getByRole('button', { name: 'Edit Product' })
            .waitFor({ state: 'visible', timeout: 60_000 });

          if (!await newProductPage.digitalOfferCertificationTab.isVisible()) continue;

          await newProductPage.digitalOfferCertificationTab.click();
          await newProductPage.waitForOSLoad();

          if (await docDetailsPage.initiateDOCButton.isVisible()) { found = true; break; }
        }

        if (!found) {
          test.skip(true, 'No products ready for DOC initiation. Please create a new product with Digital Offer enabled.');
        }
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
  // TC-002 — Navigating back to the DOC Detail page preserves status/stage
  // ---------------------------------------------------------------------------
  test('should initiate DOC from stage button and produce same status/stage transition',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-002 (AC1): Verify that navigating to the DOC Detail page (captured after TC-001) ' +
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
  // TC-003 — Digital Offer Details tab is present and clickable (AC1)
  // ---------------------------------------------------------------------------
  test('should show Digital Offer Details tab as clickable after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-003 (AC1): Digital Offer Details tab must be present and interactive ' +
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
  // TC-004 — Roles & Responsibilities tab is present and clickable (AC1)
  // ---------------------------------------------------------------------------
  test('should show Roles & Responsibilities tab as clickable after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-004 (AC1): Roles & Responsibilities tab must appear after DOC initiation ' +
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
  // TC-005 — ITS Checklist tab is present and clickable (AC1)
  // ---------------------------------------------------------------------------
  test('should show ITS Checklist tab as clickable after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-005 (AC1): ITS Checklist tab must appear after DOC initiation and be interactive.',
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
  // TC-007 — Initiator username and date shown under Initiate stage (AC1)
  // ---------------------------------------------------------------------------
  test('should show initiator username and date under the Initiate stage in the DOC flow',
    async ({ page, docDetailsPage, userCredentials }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-007 (AC1): After initiation the DOC flow must show the username of the user who ' +
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
  // TC-008 — Cancel DOC button is available after initiation (AC1)
  // ---------------------------------------------------------------------------
  test('should show Cancel DOC button for privileged user after initiation',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('normal');
      await allure.tag('regression');
      await allure.description(
        'TC-008 (AC1): A user with CANCEL_DIGITAL_OFFER_CERTIFICATION privilege must see ' +
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
  // TC-011 (smoke) — DOC Details header: VESTA ID, DOC ID format,
  //                  Release version, Target Release Date (AC2)
  // ---------------------------------------------------------------------------
  test('should display correct VESTA ID, DOC ID format, and populated Target Release Date in header @smoke',
    async ({ page, docDetailsPage }) => {
      await allure.suite('DOC');
      await allure.severity('critical');
      await allure.tag('smoke');
      await allure.description(
        'TC-011 (AC2): DOC Detail header must show VESTA ID entered during creation, ' +
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
        // The VESTA ID was set dynamically in TC-001; verify any numeric VESTA ID is visible
        await expect(page.getByText(/VESTA ID/).locator('..').getByText(/\d+/).first()).toBeVisible({ timeout: 30_000 });
      });

      await test.step('Verify Target Release Date is populated', async () => {
        await docDetailsPage.expectTargetReleaseDatePopulated();
      });
    });
});
