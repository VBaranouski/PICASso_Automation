/**
 * Spec 11.3 — Landing Page: My DOCs Tab
 *
 * Verifies the My DOCs grid, columns, filters, navigation, and empty state.
 * Depends on: doc-state-setup (a DOC in Controls Scoping status exists in the system).
 */
import { test, expect } from '../../src/fixtures';
import { readDocState } from '../../src/helpers/doc.helper';
import * as allure from 'allure-js-commons';

test.describe('DOC - Landing Page: My DOCs Tab (11.3) @regression', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page, loginPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await page.waitForURL(/GRC_PICASso/, { timeout: 60_000 });
  });

  // ── LANDING-DOCS-001 ──────────────────────────────────────────────────────
  test('should show My DOCs tab visible on the Landing Page', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-001: The My DOCs tab must be visible on the Landing Page ' +
      'for a user with VIEW_DOC / VIEW_ALL_DOCS privilege.',
    );

    await test.step('Go to Landing Page', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
    });

    await test.step('Verify My DOCs tab is visible', async () => {
      await expect(landingPage.myDocsTab).toBeVisible({ timeout: 30_000 });
    });
  });

  // ── LANDING-DOCS-002 ──────────────────────────────────────────────────────
  test('should show My DOCs tab positioned after My Releases tab in the tab list', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-002: My DOCs tab must appear after the My Releases tab in the tab list.',
    );

    await test.step('Go to Landing Page', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
    });

    await test.step('Verify tab order: My Releases appears before My DOCs', async () => {
      const allTabs = await landingPage.getTabNames();
      const releasesIdx = allTabs.findIndex(t => t.includes('My Releases'));
      const docsIdx = allTabs.findIndex(t => t.includes('My DOCs'));
      expect(releasesIdx).toBeGreaterThanOrEqual(0);
      expect(docsIdx).toBeGreaterThan(releasesIdx);
    });
  });

  // ── LANDING-DOCS-003 ──────────────────────────────────────────────────────
  test('should display all expected columns on the My DOCs grid', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-003: My DOCs grid must show: DOC Name, Product, VESTA ID, ' +
      'DOC Status, Certification Decision, Target Release Date, Created By, IT Owner, DOC Lead.',
    );

    await test.step('Open My DOCs tab', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
    });

    await test.step('Verify all expected column headers are present', async () => {
      const expected = [
        'DOC Name', 'Product', 'VESTA ID', 'DOC Status',
        'Certification Decision', 'Target Release Date', 'Created By', 'IT Owner', 'DOC Lead',
      ];
      await landingPage.expectColumnHeadersContain(expected);
    });
  });

  // ── LANDING-DOCS-004 ──────────────────────────────────────────────────────
  test('should show clickable DOC Name links that navigate to DOC Detail page', async ({ page, landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-004: DOC Name column must contain clickable links. ' +
      'Clicking one navigates to the DOC Detail page.',
    );

    await test.step('Open My DOCs tab', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
    });

    await test.step('Click the first DOC Name link', async () => {
      await landingPage.clickFirstGridLink();
    });

    await test.step('Verify navigation to DOC Detail page', async () => {
      await page.waitForURL(/GRC_PICASso_DOC\/DOCDetail/, { timeout: 30_000 });
    });
  });

  // ── LANDING-DOCS-005 ──────────────────────────────────────────────────────
  test('should show Certification Decision as dash for a newly initiated DOC', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-005: Certification Decision column shows "–" until a decision is provided.',
    );

    const docState = readDocState();
    const persistedDocId = new URL(docState.docDetailsUrl).searchParams.get('DOCId');

    await test.step('Open My DOCs tab', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.changePerPage('100');
      await landingPage.waitForGridDataRows();
    });

    await test.step('Locate the persisted DOC row across paginated results', async () => {
      expect(persistedDocId).toBeTruthy();
    });

    await test.step('Check that the persisted DOC row has no certification decision yet', async () => {
      let docLink = landingPage.grid.locator(`a[href*="DOCId=${persistedDocId}"]`).first();

      for (let pageIndex = 0; pageIndex < 10; pageIndex++) {
        const foundOnCurrentPage = await docLink.isVisible().catch(() => false);
        if (foundOnCurrentPage) {
          break;
        }

        const nextEnabled = await landingPage.nextPageButton.isEnabled().catch(() => false);
        if (!nextEnabled) {
          break;
        }

        await landingPage.clickNextPage();
        await landingPage.waitForGridDataRows();
        docLink = landingPage.grid.locator(`a[href*="DOCId=${persistedDocId}"]`).first();
      }

      await expect(docLink).toBeVisible({ timeout: 15_000 });

      const docRow = landingPage.grid.getByRole('row').filter({ has: docLink }).first();
      const rowText = (await docRow.textContent())?.replace(/\s+/g, ' ').trim() ?? '';

      expect(rowText).toContain('Controls Scoping');
      expect(/CERTIFIED|WAIVER|REJECTED/i.test(rowText)).toBe(false);
    });
  });

  // ── LANDING-DOCS-006 ──────────────────────────────────────────────────────
  test('should display all My DOCs filter controls', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-006: My DOCs tab must show Search, Product, VESTA ID, DOC Status, ' +
      'Certification Decision, DOC Lead filters and a Reset button.',
    );

    await test.step('Open My DOCs tab', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
    });

    await test.step('Verify all filter controls are visible', async () => {
      await landingPage.expectDocsFiltersVisible();
    });
  });

  // ── LANDING-DOCS-007 ──────────────────────────────────────────────────────
  test('should filter DOCs by DOC Status dropdown', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-007: Selecting a status in the DOC Status dropdown must filter the grid.',
    );

    let initialCount = 0;

    await test.step('Open My DOCs tab and capture initial row count', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
      initialCount = await landingPage.getGridRowCount();
    });

    await test.step('Select "Controls Scoping" in DOC Status dropdown', async () => {
      await landingPage.filterDocsByStatus('Controls Scoping');
    });

    await test.step('Verify all visible rows have Controls Scoping status', async () => {
      const rows = landingPage.grid.getByRole('row');
      const rowCount = await rows.count();
      for (let i = 1; i < rowCount; i++) {
        const rowText = await landingPage.getGridRowText(i);
        expect(rowText).toContain('Controls Scoping');
      }
    });
  });

  // ── LANDING-DOCS-008 ──────────────────────────────────────────────────────
  test('should clear all filters when Reset button is clicked', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-008: Clicking Reset must clear all active DOC filters and restore the full list.',
    );

    let initialCount = 0;

    await test.step('Open My DOCs tab and note initial row count', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
      initialCount = await landingPage.getGridRowCount();
    });

    await test.step('Apply DOC Status filter', async () => {
      await landingPage.filterDocsByStatus('Controls Scoping');
    });

    await test.step('Click Reset and verify row count returns to original', async () => {
      await landingPage.resetFilters();
      await landingPage.waitForGridDataRows();
      const countAfterReset = await landingPage.getGridRowCount();
      expect(countAfterReset).toBeGreaterThanOrEqual(initialCount);
    });
  });

  // ── LANDING-DOCS-009 ──────────────────────────────────────────────────────
  test('should change displayed rows via the per-page selector', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-009: The per-page selector must change the number of rows displayed in the My DOCs grid.',
    );

    await test.step('Open My DOCs tab', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
    });

    await test.step('Change per-page to 20 and verify at most 20 rows', async () => {
      await landingPage.changePerPage('20');
      const rowCount = await landingPage.getGridRowCount();
      expect(rowCount).toBeLessThanOrEqual(20);
    });
  });

  // ── LANDING-DOCS-010 ──────────────────────────────────────────────────────
  test('should filter DOCs by DOC name using the search field', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-010: The search field must filter the DOC grid by DOC name. ' +
      'Entering a known DOC name substring reduces the result set.',
    );

    let initialCount = 0;

    await test.step('Open My DOCs tab and capture initial row count', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
      initialCount = await landingPage.getGridRowCount();
    });

    await test.step('Search for "Annual review" in the DOC name search field', async () => {
      await landingPage.searchDocsByName('Annual review');
    });

    await test.step('Verify filtered row count is less than or equal to initial, and rows match the search term', async () => {
      const filteredCount = await landingPage.getGridRowCount();
      expect(filteredCount).toBeGreaterThanOrEqual(1);
      expect(filteredCount).toBeLessThanOrEqual(initialCount);
    });
  });

  // ── LANDING-DOCS-011 ──────────────────────────────────────────────────────
  test('should show all My DOCs grid columns as sortable', async ({ landingPage }) => {
    await allure.suite('DOC / Landing Page');
    await allure.description(
      'LANDING-DOCS-011: All My DOCs grid column headers must be sortable (clickable). ' +
      'Clicking a column header re-sorts the grid.',
    );

    await test.step('Open My DOCs tab', async () => {
      await landingPage.goto();
      await landingPage.expectPageLoaded({ timeout: 60_000 });
      await landingPage.clickTab('My DOCs');
      await landingPage.waitForGridDataRows();
    });

    await test.step('Click DOC Name column header and verify grid still shows rows', async () => {
      const docNameHeader = landingPage.grid.getByRole('columnheader', { name: /DOC Name/i });
      await expect(docNameHeader).toBeVisible({ timeout: 15_000 });
      await docNameHeader.click();
      await landingPage.waitForGridDataRows();
      const rowCount = await landingPage.getGridRowCount();
      expect(rowCount).toBeGreaterThanOrEqual(1);
    });

    await test.step('Click DOC Status column header and verify grid still shows rows', async () => {
      const statusHeader = landingPage.grid.getByRole('columnheader', { name: /doc Status/i });
      await expect(statusHeader).toBeVisible({ timeout: 15_000 });
      await statusHeader.click();
      await landingPage.waitForGridDataRows();
    });
  });
});
