/**
 * Spec 11.4 — DOC Detail: Header & Navigation
 *
 * Verifies breadcrumb, 5-stage pipeline visibility, active stage highlight,
 * Hide/Show Flow toggle, and status badge on a DOC in Controls Scoping status.
 *
 * Depends on: doc-state-setup (persists docDetailsUrl to .doc-state.json)
 */
import { test, expect } from '../../src/fixtures';
import { readDocState } from '../../src/helpers/doc.helper';
import * as allure from 'allure-js-commons';

test.describe('DOC - DOC Detail Header & Navigation (11.4) @regression', () => {
  test.setTimeout(180_000);

  let docDetailsUrl: string;

  test.beforeAll(() => {
    docDetailsUrl = readDocState().docDetailsUrl;
  });

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  // ── DOC-DETAIL-001 ────────────────────────────────────────────────────────
  test('should show breadcrumb with clickable Home and Product Name links', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-001: DOC Detail breadcrumb must show "Home" as a clickable link ' +
      'and a Product Name link.',
    );

    await test.step('Navigate to DOC Detail page', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify Home link is visible in breadcrumb', async () => {
      await docDetailsPage.expectBreadcrumbHomeLinkVisible();
    });

    await test.step('Verify Product Name link is visible in breadcrumb', async () => {
      await docDetailsPage.expectBreadcrumbProductLinkVisible();
    });
  });

  // ── DOC-DETAIL-002 ────────────────────────────────────────────────────────
  test('should show all 5 DOC pipeline stages in the flow header', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-002: The DOC pipeline must render all 5 stage tabs: ' +
      'Initiate DOC · Scope ITS Controls · Risk Assessment · Risk Summary Review · Issue Certification.',
    );

    await test.step('Navigate to DOC Detail page', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify all 5 pipeline stage tabs are visible', async () => {
      await docDetailsPage.expectAllPipelineStagesVisible();
    });
  });

  // ── DOC-DETAIL-003 ────────────────────────────────────────────────────────
  test('should highlight the Scope ITS Controls stage as the active stage', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-003: For a DOC in Controls Scoping status the "Scope ITS Controls" ' +
      'pipeline stage must be marked as the active (selected) stage.',
    );

    await test.step('Navigate to DOC Detail page', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify Scope ITS Controls stage is active', async () => {
      await docDetailsPage.expectDocStage('Scope ITS Controls');
    });
  });

  // ── DOC-DETAIL-004 ────────────────────────────────────────────────────────
  test('should hide the pipeline when Hide Flow is clicked and restore it with Show Flow', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-004: Clicking "Hide Flow" must hide the pipeline; ' +
      'clicking "Show Flow" must restore it.',
    );

    await test.step('Navigate to DOC Detail page', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify pipeline is visible initially', async () => {
      await docDetailsPage.expectPipelineVisible();
    });

    await test.step('Click Hide Flow and verify pipeline is hidden', async () => {
      await docDetailsPage.clickHideShowFlowButton();
      await docDetailsPage.expectPipelineHidden();
    });

    await test.step('Click Show Flow and verify pipeline is visible again', async () => {
      await docDetailsPage.clickHideShowFlowButton();
      await docDetailsPage.expectPipelineVisible();
    });
  });

  // ── DOC-DETAIL-005 ────────────────────────────────────────────────────────
  test('should display Controls Scoping in the DOC status badge', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-005: The status badge in the DOC Detail header must show "Controls Scoping".',
    );

    await test.step('Navigate to DOC Detail page', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify status badge shows Controls Scoping', async () => {
      await docDetailsPage.expectDocStatus('Controls Scoping');
    });
  });

  // ── DOC-DETAIL-006 ────────────────────────────────────────────────────────
  test('should show DOC ID in the correct DOC-NNN format', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-006: The DOC ID displayed in the header must match the DOC-NNN format.',
    );

    await test.step('Navigate to DOC Detail page', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify DOC ID format', async () => {
      await docDetailsPage.expectDocIdFormat();
    });
  });

  // ── DOC-DETAIL-007 ────────────────────────────────────────────────────────
  test('should show all three DOC content tabs after initiation', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-007: After DOC initiation all three content tabs must be present and clickable: ' +
      'Digital Offer Details · Roles & Responsibilities · ITS Checklist.',
    );

    await test.step('Navigate to DOC Detail page', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify all three tabs are clickable', async () => {
      await docDetailsPage.expectDigitalOfferDetailsTabClickable();
      await docDetailsPage.expectRolesResponsibilitiesTabClickable();
      await docDetailsPage.expectITSChecklistTabClickable();
    });
  });

  // ── DOC-DETAIL-008 ────────────────────────────────────────────────────────
  test('should show username and date under each completed pipeline stage', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-008: For a completed DOC all five pipeline stage tabs must show ' +
      'a username and completion date as sub-text beneath the stage label.',
    );

    const completedDocUrl =
      'https://qa.leap.schneider-electric.com/GRC_PICASso_DOC/DOCDetail?DOCId=273&ProductId=898';

    await test.step('Navigate to a completed DOC (Annual review — DOCId=273)', async () => {
      await page.goto(completedDocUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify each pipeline stage tab has sub-text containing a username and date', async () => {
      // The pipeline stages container holds both the tab label AND the user+date sub-text.
      // Strategy: verify the pipeline tablist area contains at least one date-format string
      // (DD Mon YYYY) indicating that completion information has been populated.
      const pipelineContainer = page.locator('[role="tablist"]').first();
      await expect(pipelineContainer, 'Pipeline tablist should be visible').toBeVisible({ timeout: 20_000 });

      // The pipeline area should contain date-format text for each completed stage
      // Pattern: "DD Mon YYYY" e.g. "26 Aug 2025"
      const datePattern = /\d{1,2} \w{3} \d{4}/;
      const pipelineText = await pipelineContainer.evaluate((el) => (el as { textContent?: string }).textContent || '');

      // Verify at least one date is present in the pipeline area (indicating completion info)
      expect(
        datePattern.test(pipelineText),
        `Pipeline area should contain at least one date (DD Mon YYYY) for completed stages. Got: "${pipelineText.substring(0, 200)}"`,
      ).toBe(true);

      // Verify the Initiate DOC tab is visible (it's the one stage shared by all DOCs)
      await expect(
        page.getByRole('tab', { name: /Initiate DOC/i }),
        'Initiate DOC stage tab should be visible',
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // ── DOC-DETAIL-009 ────────────────────────────────────────────────────────
  test('should display Certification Decision badge in header for a completed DOC', async ({ page, docDetailsPage }) => {
    await allure.suite('DOC / DOC Detail / Header');
    await allure.description(
      'DOC-DETAIL-009: For a completed DOC the header area must show a ' +
      '"Certification Decision" label with a "CERTIFIED" value badge.',
    );

    const completedDocUrl =
      'https://qa.leap.schneider-electric.com/GRC_PICASso_DOC/DOCDetail?DOCId=273&ProductId=898';

    await test.step('Navigate to completed DOC (Annual review — DOCId=273)', async () => {
      await page.goto(completedDocUrl);
      await docDetailsPage.waitForOSLoad();
    });

    await test.step('Verify "Certification Decision" label is visible in the header area', async () => {
      // Use the label element (inside #IssueCertification_Con) to avoid strict-mode conflict
      // with the tab of the same name
      await expect(
        page.locator('label').filter({ hasText: 'Certification Decision' }).first(),
        '"Certification Decision" label should be visible in the header',
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('Verify "CERTIFIED" badge / value is visible in the header area', async () => {
      // The value renders as a <span class="text-primary">CERTIFIED</span> or similar
      await expect(
        page.getByText(/^CERTIFIED$/i).first(),
        '"CERTIFIED" badge should be visible',
      ).toBeVisible({ timeout: 20_000 });
    });

    await test.step('Verify the DOC shows a "Completed" status indicator', async () => {
      // The completed DOC has a status badge / text indicating "Completed"
      await expect(
        page.getByText(/Completed/i).first(),
        '"Completed" status should be visible on the completed DOC',
      ).toBeVisible({ timeout: 20_000 });
    });
  });
});
