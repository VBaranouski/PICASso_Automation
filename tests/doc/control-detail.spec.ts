/**
 * Spec 11.8 — DOC Detail: Control Detail Page
 *
 * Navigates to the Control Detail page via an ITS Checklist Control ID link
 * and verifies the breadcrumb, header, content sections, stage-specific message,
 * and the Descope Control button visibility.
 *
 * Depends on: doc-detail-its (ITS Checklist must have been verified as working)
 */
import { test, expect } from '../../src/fixtures';
import { readDocState } from '../../src/helpers/doc.helper';
import * as allure from 'allure-js-commons';

test.describe('DOC - Control Detail Page (11.8) @regression', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(180_000);

  let docDetailsUrl: string;
  let controlDetailUrl: string;

  test.beforeAll(() => {
    docDetailsUrl = readDocState().docDetailsUrl;
  });

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  // ── DOC-CONTROL-001 ───────────────────────────────────────────────────────
  test('should navigate to Control Detail page via ITS Checklist Control ID link', async ({
    page, docDetailsPage, controlDetailPage,
  }) => {
    await allure.suite('DOC / Control Detail');
    await allure.severity('normal');
    await allure.description(
      'DOC-CONTROL-001: Clicking a Control ID link in the ITS Checklist tab must ' +
      'navigate to the Control Detail page.',
    );

    await test.step('Navigate to DOC Detail and open ITS Checklist tab', async () => {
      await page.goto(docDetailsUrl);
      await docDetailsPage.waitForOSLoad();
      await docDetailsPage.clickITSChecklistTab();
    });

    // Guard: the ITS Checklist must have at least one control row
    const hasControls = await docDetailsPage.hasITSControls();
    if (!hasControls) {
      test.skip(true, 'No ITS controls available in this DOC — cannot navigate to Control Detail.');
      return;
    }

    await test.step('Click the first Control ID link', async () => {
      await docDetailsPage.clickFirstControlIdLink();
      controlDetailUrl = page.url();
    });

    await test.step('Verify Control Detail page loaded', async () => {
      await controlDetailPage.waitForPageLoaded();
      await expect(page).toHaveURL(/ControlDetail/, { timeout: 30_000 });
    });
  });

  // ── DOC-CONTROL-002 ───────────────────────────────────────────────────────
  test('should show the Control ID in the page header', async ({ page, controlDetailPage }) => {
    await allure.suite('DOC / Control Detail');
    await allure.description(
      'DOC-CONTROL-002: Control Detail header must show the Control ID in ITS-NNN format.',
    );

    await test.step('Navigate to Control Detail page', async () => {
      if (!controlDetailUrl) { test.skip(true, 'Control Detail URL not captured — run DOC-CONTROL-001 first.'); return; }
      await page.goto(controlDetailUrl);
      await controlDetailPage.waitForPageLoaded();
    });

    await test.step('Verify Control ID format in header', async () => {
      await controlDetailPage.expectControlIdFormat();
    });
  });

  // ── DOC-CONTROL-003 ───────────────────────────────────────────────────────
  test('should show breadcrumb with Home and Product Name links', async ({ page, controlDetailPage }) => {
    await allure.suite('DOC / Control Detail');
    await allure.description(
      'DOC-CONTROL-003: Breadcrumb must show: Home (link) > Product Name (link) > DOC Name (link) > Control ID.',
    );

    await test.step('Navigate to Control Detail page', async () => {
      if (!controlDetailUrl) { test.skip(true, 'Control Detail URL not captured — run DOC-CONTROL-001 first.'); return; }
      await page.goto(controlDetailUrl);
      await controlDetailPage.waitForPageLoaded();
    });

    await test.step('Verify Home and Product Name links are visible in breadcrumb', async () => {
      await controlDetailPage.expectBreadcrumbHomeLinkVisible();
      await controlDetailPage.expectBreadcrumbProductLinkVisible();
    });
  });

  // ── DOC-CONTROL-004 ───────────────────────────────────────────────────────
  test('should show Description and Evidence Expectation sections', async ({ page, controlDetailPage }) => {
    await allure.suite('DOC / Control Detail');
    await allure.description(
      'DOC-CONTROL-004: Control Detail must display Description and Evidence Expectation sections.',
    );

    await test.step('Navigate to Control Detail page', async () => {
      if (!controlDetailUrl) { test.skip(true, 'Control Detail URL not captured — run DOC-CONTROL-001 first.'); return; }
      await page.goto(controlDetailUrl);
      await controlDetailPage.waitForPageLoaded();
    });

    await test.step('Verify Description section is visible', async () => {
      await controlDetailPage.expectDescriptionSectionVisible();
    });

    await test.step('Verify Evidence Expectation section is visible', async () => {
      await controlDetailPage.expectEvidenceExpectationSectionVisible();
    });
  });

  // ── DOC-CONTROL-005 ───────────────────────────────────────────────────────
  test('should show scope-stage read-only message on Scope ITS Controls stage', async ({ page, controlDetailPage }) => {
    await allure.suite('DOC / Control Detail');
    await allure.description(
      'DOC-CONTROL-005: On the Scope ITS Controls stage Control Detail must show ' +
      '"No evidence links, findings or comments yet" placeholder message.',
    );

    await test.step('Navigate to Control Detail page', async () => {
      if (!controlDetailUrl) { test.skip(true, 'Control Detail URL not captured — run DOC-CONTROL-001 first.'); return; }
      await page.goto(controlDetailUrl);
      await controlDetailPage.waitForPageLoaded();
    });

    await test.step('Verify scoping stage placeholder message is visible', async () => {
      await controlDetailPage.expectScopingStageReadOnlyMessageVisible();
    });
  });

  // ── DOC-CONTROL-006 ───────────────────────────────────────────────────────
  test('should show Descope Control button for privileged user on Control Detail', async ({ page, controlDetailPage }) => {
    await allure.suite('DOC / Control Detail');
    await allure.description(
      'DOC-CONTROL-006: "Descope Control" button must be visible for a user with ' +
      'SCOPE_IT_SECURITY_CONTROLS privilege on the Control Detail page.',
    );

    await test.step('Navigate to Control Detail page', async () => {
      if (!controlDetailUrl) { test.skip(true, 'Control Detail URL not captured — run DOC-CONTROL-001 first.'); return; }
      await page.goto(controlDetailUrl);
      await controlDetailPage.waitForPageLoaded();
    });

    await test.step('Verify Descope Control button is visible', async () => {
      await controlDetailPage.expectDescopeControlButtonVisible();
    });
  });
});
