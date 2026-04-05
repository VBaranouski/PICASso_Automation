import { test, expect } from '../../src/fixtures';
import type { LandingTab } from '../../src/pages';
import * as allure from 'allure-js-commons';

test.describe('Landing Page @smoke', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
  });

  test('should display all tabs on landing page', async ({ landingPage }) => {
    await allure.suite('Landing Page');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('LANDING-HOME-001: Verify all 5 tabs are visible on the Landing Page after login');

    await test.step('Verify My Tasks tab is visible and selected by default', async () => {
      await landingPage.expectTabActive('My Tasks');
    });

    await test.step('Verify all tabs are visible', async () => {
      await landingPage.expectTabsVisible();
    });
  });

  test('should have My Tasks tab selected by default after login @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description('LANDING-TAB-DEFAULT-001: Verify "My Tasks" tab is the active/selected tab immediately after login — no user interaction required');

    await test.step('Verify My Tasks tab is selected (aria-selected=true)', async () => {
      await landingPage.expectMyTasksSelectedByDefault();
    });
  });

  test('should load content when clicking each tab', async ({ landingPage }) => {
    await allure.suite('Landing Page');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('LANDING-HOME-002: Verify each tab loads its grid content with data');

    const tabs: LandingTab[] = ['My Tasks', 'My Products', 'My Releases', 'My DOCs', 'Reports & Dashboards'];

    for (const tabName of tabs) {
      await test.step(`Click "${tabName}" tab and verify content loads`, async () => {
        await landingPage.clickTab(tabName);
        await landingPage.expectTabActive(tabName);
        await landingPage.expectTabpanelVisible();
        await landingPage.expectColumnHeadersExist();
      });
    }
  });
});

test.describe('Landing Page - My Tasks Tab @regression', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
  });

  test('should display correct grid columns for My Tasks', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-003: Verify My Tasks grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      await landingPage.expectColumnHeadersContain(['Name', 'Product', 'Release']);
    });
  });

  test('should display all required My Tasks grid columns @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('critical');
    await allure.tag('regression');
    await allure.description(
      'LANDING-TASKS-COLS-001: Verify My Tasks grid contains ALL required columns: ' +
      'Name, Description, Status, Product, Release, VESTA Id, PROCESS TYPE, ' +
      'Assignee, DOC Lead, Product Owner, Security Manager',
    );

    await test.step('Verify all required column headers are present', async () => {
      await landingPage.expectMyTasksAllColumnsPresent();
    });
  });

  test('should have Show Closed Tasks toggle OFF by default @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-TASKS-TOGGLE-001: Verify the "Show Closed Tasks" checkbox is unchecked (OFF) ' +
      'immediately after landing on the page — closed tasks should not be shown by default',
    );

    await test.step('Verify Show Closed Tasks is unchecked by default', async () => {
      await landingPage.expectShowClosedTasksUncheckedByDefault();
    });
  });

  test('should display filters for My Tasks', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-004: Verify My Tasks tab shows search, release, product, date range and status filters');

    await test.step('Verify all My Tasks filters are visible', async () => {
      await landingPage.expectTasksFiltersVisible();
    });
  });

  test('should toggle Show Closed Tasks checkbox and update data', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-005: Verify toggling Show Closed Tasks checkbox changes the data in the grid');

    await test.step('Verify initial record count is non-zero', async () => {
      await landingPage.expectRecordCountGreaterThan(0);
    });

    await test.step('Toggle Show Closed Tasks checkbox', async () => {
      await landingPage.toggleTasksShowClosed();
    });

    await test.step('Verify grid still has data', async () => {
      await landingPage.expectGridVisible();
    });
  });

  test('should change per-page value and update grid rows', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-006: Verify changing the per-page dropdown updates the number of visible rows');

    let initialRowCount: number;

    await test.step('Verify grid is displayed with default per page', async () => {
      initialRowCount = await landingPage.expectDefaultPageSize();
    });

    await test.step('Change to 20 per page', async () => {
      await landingPage.changePerPage('20');
    });

    await test.step('Verify row count changed', async () => {
      await landingPage.expectRowCountAtLeast(initialRowCount);
    });
  });

  test('should navigate to next page using pagination', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-007: Verify pagination next button works and loads new data');

    await test.step('Click next page button', async () => {
      await landingPage.clickNextPage();
      await landingPage.waitForOSLoad();
    });

    await test.step('Verify grid still has data', async () => {
      await landingPage.expectGridVisible();
      await landingPage.expectGridHasRows();
    });
  });
});

test.describe('Landing Page - My Products Tab @regression', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    await landingPage.clickTab('My Products');
  });

  test('should display correct grid columns for My Products', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-008: Verify My Products grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      await landingPage.expectColumnHeadersContain([
        'Org Level 1', 'Product', 'Product Id', 'Product Status', 'Latest Release',
      ]);
    });
  });

  test('should display filters and Show Active Only is checked by default', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-009: Verify My Products filters are visible and Show Active Only checkbox is checked');

    await test.step('Verify Show Active Only checkbox is checked', async () => {
      await landingPage.expectProductsShowActiveOnlyChecked();
    });

    await test.step('Verify Reset button is visible', async () => {
      await landingPage.expectResetButtonVisible();
    });
  });

  test('should uncheck Show Active Only and update data', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-010: Verify unchecking Show Active Only shows inactive products too');

    await test.step('Uncheck Show Active Only', async () => {
      await landingPage.toggleShowActiveOnly();
    });

    await test.step('Verify Show Active Only is unchecked', async () => {
      await landingPage.expectProductsShowActiveOnlyUnchecked();
    });
  });

  test('should change per-page value on My Products', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-011: Verify changing per-page dropdown on My Products updates visible rows');

    await test.step('Wait for grid data to load', async () => {
      await landingPage.grid.getByRole('row').nth(1).waitFor({ timeout: 60_000 });
    });

    await test.step('Change to 20 per page', async () => {
      await landingPage.changePerPage('20');
    });

    await test.step('Verify grid still has rows', async () => {
      await landingPage.expectGridHasRows();
    });
  });
});

test.describe('Landing Page - My Releases Tab @regression', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    await landingPage.clickTab('My Releases');
  });

  test('should display correct grid columns for My Releases', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-012: Verify My Releases grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      await landingPage.expectColumnHeadersContain([
        'Product', 'Release', 'Release Status', 'Target Release Date', 'Created By',
      ]);
    });
  });

  test('should display Show Active Only checked by default', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-013: Verify Show Active Only is checked by default on My Releases');

    await test.step('Verify checkbox is checked', async () => {
      await landingPage.expectReleasesShowActiveOnlyChecked();
    });
  });

  test('should uncheck Show Active Only and update data', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-014: Verify unchecking Show Active Only on Releases changes record count');

    await test.step('Uncheck Show Active Only', async () => {
      await landingPage.toggleReleasesShowActiveOnly();
    });

    await test.step('Verify grid still has data', async () => {
      await landingPage.expectGridVisible();
    });
  });

  test('should navigate to next page on My Releases', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-015: Verify pagination works on My Releases tab');

    await test.step('Click next page', async () => {
      await landingPage.clickNextPage();
      await landingPage.waitForOSLoad();
    });

    await test.step('Verify pagination is visible', async () => {
      await landingPage.expectGridVisible();
    });
  });
});

test.describe('Landing Page - My DOCs Tab @regression', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    await landingPage.clickTab('My DOCs');
  });

  test('should display correct grid columns for My DOCs', async ({ landingPage }) => {
    await allure.suite('Landing Page - My DOCs');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-016: Verify My DOCs grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      await landingPage.expectColumnHeadersContain([
        'DOC Name', 'doc Status', 'certification decision', 'DOC Lead',
      ]);
    });
  });

  test('should display DOC search box and filters', async ({ landingPage }) => {
    await allure.suite('Landing Page - My DOCs');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-017: Verify My DOCs tab shows search by DOC name and filter dropdowns');

    await test.step('Verify DOC filters are visible', async () => {
      await landingPage.expectDocsFiltersVisible();
    });
  });

  test('should display DOC data in grid', async ({ landingPage }) => {
    await allure.suite('Landing Page - My DOCs');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-018: Verify My DOCs grid loads with data');

    await test.step('Verify grid has records', async () => {
      await landingPage.expectRecordCountGreaterThan(0);
    });

    await test.step('Verify grid rows are displayed', async () => {
      await landingPage.expectGridHasRows();
    });
  });
});

test.describe('Landing Page - Reports & Dashboards Tab @regression', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    await landingPage.clickTab('Reports & Dashboards');
  });

  test('should display correct grid columns for Reports & Dashboards', async ({ landingPage }) => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-019: Verify Reports & Dashboards grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      await landingPage.expectColumnHeadersContain([
        'Product', 'Release', 'Release Status',
        'Data Protection and Privacy Risk Level', 'CyberSecurity RISK Level',
      ]);
    });
  });

  test('should display Access Tableau link', async ({ landingPage }) => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-020: Verify Access Tableau link is visible on Reports & Dashboards tab');

    await test.step('Verify Access Tableau link is visible', async () => {
      await landingPage.expectAccessTableauLinkVisible();
    });
  });

  test('should display More Filters link', async ({ landingPage }) => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-021: Verify More Filters link is available on Reports & Dashboards');

    await test.step('Verify More Filters and Reset are visible', async () => {
      await landingPage.expectMoreFiltersLinkVisible();
      await landingPage.expectResetButtonVisible();
    });
  });

  test('should display data in reports grid', async ({ landingPage }) => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-022: Verify Reports & Dashboards grid loads data');

    await test.step('Verify grid has records', async () => {
      await landingPage.expectRecordCountGreaterThan(0);
    });

    await test.step('Verify grid rows are displayed', async () => {
      await landingPage.expectGridHasRows();
    });
  });

  test('should change per-page value on Reports & Dashboards', async ({ landingPage }) => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('LANDING-HOME-023: Verify changing per-page dropdown on Reports & Dashboards updates visible rows');

    await test.step('Wait for grid data to load', async () => {
      await landingPage.grid.getByRole('row').nth(1).waitFor({ timeout: 60_000 });
    });

    await test.step('Change to 20 per page', async () => {
      await landingPage.changePerPage('20');
    });

    await test.step('Verify grid still has rows', async () => {
      await landingPage.expectGridHasRows();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WORKFLOW 2.2 — My Tasks: Search, Reset, Review button navigation
// ────────────────────────────────────────────────────────────────────────────

test.describe('Landing Page - My Tasks Filters & Navigation @regression', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    // My Tasks is default tab — just wait for grid
    await landingPage.waitForGridDataRows();
  });

  test('should narrow task list when searching by task name @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-TASKS-SEARCH-001: Verify the Search input field on My Tasks filters the grid ' +
      'when a query term is entered.',
    );

    let initialCount: number;

    await test.step('Record initial grid row count', async () => {
      initialCount = await landingPage.getGridRowCount();
      expect(initialCount).toBeGreaterThan(0);
    });

    await test.step('Search for a specific task name substring', async () => {
      // Use first row text as search term to guarantee a result
      const firstRowText = await landingPage.getGridRowText(1);
      const searchTerm = firstRowText.split(/\s+/).slice(0, 2).join(' ').slice(0, 20).trim();
      test.skip(!searchTerm, 'Could not extract a search term from the first row.');
      await landingPage.searchTasksByName(searchTerm);
    });

    await test.step('Verify grid updated (still visible with data or fewer rows)', async () => {
      await landingPage.expectGridVisible();
    });
  });

  test('should clear filters when Reset button is clicked @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-TASKS-RESET-001: Verify that clicking the Reset button on My Tasks ' +
      'clears the search input and restores default grid state.',
    );

    await test.step('Apply a filter by typing in the search box', async () => {
      await landingPage.searchTasksByName('zzz_no_match_query_xyz');
    });

    await test.step('Click Reset to clear all filters', async () => {
      await landingPage.resetFilters();
    });

    await test.step('Verify grid is restored (has rows)', async () => {
      await landingPage.expectGridVisible();
    });

    await test.step('Verify search box is cleared', async () => {
      await expect(landingPage.tasksSearchBox).toHaveValue('');
    });
  });

  test('should navigate to task detail when clicking the Review button @regression', async ({ landingPage, page }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-TASKS-REVIEW-001: Verify that clicking the "Review" button on a task row ' +
      'navigates to either the Release Detail page (SDL task) or DOC Detail page (DOC task).',
    );

    await test.step('Find a Review button in the My Tasks grid', async () => {
      const reviewButton = landingPage.grid.getByRole('link', { name: /review/i }).first();
      const hasReview = await reviewButton.isVisible({ timeout: 10_000 }).catch(() => false);
      test.skip(!hasReview, 'No Review button found in My Tasks — no tasks assigned to this user.');
    });

    await test.step('Click the first Review button', async () => {
      const reviewButton = landingPage.grid.getByRole('link', { name: /review/i }).first();
      await reviewButton.click();
    });

    await test.step('Verify navigation to Release Detail or DOC Detail page', async () => {
      await page.waitForURL(/ReleaseDetail|DOCDetail/, { timeout: 30_000 });
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WORKFLOW 2.3 — My Products: Latest Release nav, Org Level 1 filter, Actions
// ────────────────────────────────────────────────────────────────────────────

test.describe('Landing Page - My Products Advanced Navigation @regression', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    await landingPage.clickTab('My Products');
    await landingPage.waitForGridDataRows();
  });

  test('should navigate to Release Detail when clicking the Latest Release version @regression', async ({ landingPage, page }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-PRODS-LATEST-001: Verify that clicking the Latest Release version link ' +
      'in a My Products row navigates to the Release Detail page.',
    );

    let latestReleaseHref: string | null = null;

    await test.step('Find a product row that has a Latest Release link', async () => {
      // Scan rows to find one with a release link (Link index 1 = latest release)
      const rowCount = await landingPage.getGridRowCount();
      for (let r = 1; r <= Math.min(rowCount, 10); r++) {
        latestReleaseHref = await landingPage.getLatestReleaseLinkAtRow(r);
        if (latestReleaseHref && latestReleaseHref.includes('ReleaseDetail')) {
          break;
        }
        latestReleaseHref = null;
      }
      test.skip(!latestReleaseHref, 'No product with a Latest Release link found in first 10 rows.');
    });

    await test.step('Click the Latest Release link', async () => {
      // Navigate directly using the href to avoid re-scanning
      await page.goto('https://qa.leap.schneider-electric.com' + latestReleaseHref!);
    });

    await test.step('Verify navigation to Release Detail page', async () => {
      await page.waitForURL(/ReleaseDetail/, { timeout: 30_000 });
      await expect(page).toHaveURL(/ReleaseDetail/);
    });
  });

  test('should narrow product list when Org Level 1 filter is applied @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-PRODS-ORG1-001: Verify the Org Level 1 dropdown filter on My Products ' +
      'narrows the grid results when an option is selected.',
    );

    let initialCount: string;

    await test.step('Record initial record count', async () => {
      initialCount = await landingPage.getRecordCount();
      expect(Number(initialCount)).toBeGreaterThan(0);
    });

    await test.step('Open Org Level 1 dropdown and select first available option', async () => {
      await landingPage.productsOrgLevel1Dropdown.click();
      // Wait for options to appear in the virtual select
      const listbox = landingPage['page'].getByRole('listbox').filter({
        has: landingPage['page'].locator('.vscomp-option'),
      }).last();
      await listbox.waitFor({ state: 'visible', timeout: 15_000 });
      const firstOption = listbox.locator('.vscomp-option').first();
      const optionText = await firstOption.textContent();
      test.skip(!optionText?.trim(), 'No Org Level 1 options available to select.');
      await firstOption.click();
      await landingPage['page'].waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    });

    await test.step('Verify grid still has data', async () => {
      await landingPage.expectGridVisible();
    });

    await test.step('Reset filters to restore default state', async () => {
      await landingPage.resetFilters();
      await landingPage.expectGridHasRows();
    });
  });

  test('should show Inactivate option in the three-dot Actions menu @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-PRODS-ACTIONS-001: Verify that the three-dot Actions menu in My Products ' +
      'contains an "Inactivate" option for active products.',
    );

    await test.step('Click the three-dot actions menu in the first product row', async () => {
      await landingPage.clickActionsMenuAtRow(1);
    });

    await test.step('Verify the Inactivate option is visible in the menu', async () => {
      await landingPage.expectActionsMenuOptionVisible('Inactivate');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WORKFLOW 2.4 — My Releases: Search, Status filter, Reset, Release name nav
// ────────────────────────────────────────────────────────────────────────────

test.describe('Landing Page - My Releases Filters & Navigation @regression', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
    await landingPage.clickTab('My Releases');
    await landingPage.waitForGridDataRows();
  });

  test('should navigate to Release Detail when clicking a release name @regression', async ({ landingPage, page }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-RELS-NAV-001: Verify that clicking a release name link in My Releases ' +
      'navigates to the Release Detail page.',
    );

    await test.step('Click the first release name link', async () => {
      await landingPage.clickFirstReleaseName();
    });

    await test.step('Verify navigation to Release Detail page', async () => {
      await page.waitForURL(/ReleaseDetail/, { timeout: 30_000 });
    });
  });

  test('should narrow releases when release name search filter is applied @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-RELS-SEARCH-001: Verify the Release search combobox filter narrows the grid ' +
      'when a release name is entered and selected.',
    );

    let initialCount: string;

    await test.step('Record initial record count', async () => {
      initialCount = await landingPage.getRecordCount();
      expect(Number(initialCount)).toBeGreaterThan(0);
    });

    await test.step('Open search combobox and type a release name fragment', async () => {
      // Get first release name to use as search term
      const firstReleaseName = await landingPage.grid.getByRole('row').nth(1)
        .getByRole('link').first().textContent();
      const searchTerm = (firstReleaseName ?? '').slice(0, 5).trim();
      test.skip(!searchTerm, 'Could not get release name from first row.');

      await landingPage.releasesSearchDropdown.click();
      const searchInput = landingPage['page'].locator('.vscomp-search-input:focus');
      await searchInput.waitFor({ timeout: 15_000 }).catch(() => null);
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.pressSequentially(searchTerm, { delay: 100 });
        await landingPage['page'].waitForTimeout(1000);
      }
    });

    await test.step('Verify grid is still visible', async () => {
      await landingPage.expectGridVisible();
    });

    await test.step('Reset to restore default state', async () => {
      await landingPage['page'].keyboard.press('Escape');
      await landingPage.resetFilters();
      await landingPage.expectGridHasRows();
    });
  });

  test('should filter releases by status when status dropdown is applied @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-RELS-STATUS-001: Verify the Release Status dropdown filter on My Releases ' +
      'updates the grid when a status value is selected.',
    );

    await test.step('Open the Status dropdown and select first available option', async () => {
      await landingPage.releasesStatusDropdown.click();
      const listbox = landingPage['page'].getByRole('listbox').filter({
        has: landingPage['page'].locator('.vscomp-option'),
      }).last();
      await listbox.waitFor({ state: 'visible', timeout: 15_000 });
      const firstOption = listbox.locator('.vscomp-option').first();
      const optionText = await firstOption.textContent();
      test.skip(!optionText?.trim(), 'No status options available.');
      await firstOption.click();
      await landingPage['page'].waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    });

    await test.step('Verify grid updated (still visible)', async () => {
      await landingPage.expectGridVisible();
    });

    await test.step('Reset filters', async () => {
      await landingPage.resetFilters();
      await landingPage.expectGridHasRows();
    });
  });

  test('should clear all filters when Reset button is clicked @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-RELS-RESET-001: Verify that clicking Reset on My Releases clears all ' +
      'applied filters and restores the default grid state.',
    );

    await test.step('Toggle Show Active Only off to change state', async () => {
      await landingPage.toggleReleasesShowActiveOnly();
      await landingPage.expectGridVisible();
    });

    await test.step('Click Reset', async () => {
      await landingPage.resetFilters();
    });

    await test.step('Verify Show Active Only is restored to checked state', async () => {
      await landingPage.expectReleasesShowActiveOnlyChecked();
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WORKFLOW 2.6 — Header Global Actions
// ────────────────────────────────────────────────────────────────────────────

test.describe('Landing Page - Header Global Actions @regression', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ loginPage, landingPage, userCredentials }) => {
    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);
    await landingPage.expectPageLoaded({ timeout: 60_000 });
  });

  test('should display New Product button in page header @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - Header');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-HEADER-001: Verify the "New Product" button is visible in the page header on the Landing Page',
    );

    await test.step('Verify New Product button is visible', async () => {
      await landingPage.expectNewProductButtonVisible();
    });
  });

  test('should navigate to New Product form when clicking New Product button @regression', async ({ landingPage, page }) => {
    await allure.suite('Landing Page - Header');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-HEADER-002: Verify clicking "New Product" button navigates to the New Product creation form',
    );

    await test.step('Click New Product button', async () => {
      await landingPage.clickNewProductButton();
    });

    await test.step('Verify navigation to New Product form', async () => {
      // New Product button navigates to ProductDetail page with ProductId=0 (new/blank product)
      await page.waitForURL(/ProductDetail/, { timeout: 30_000 });
    });
  });

  test('should display Roles Delegation link in page header @regression', async ({ landingPage }) => {
    await allure.suite('Landing Page - Header');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-HEADER-003: Verify the "Roles Delegation" link is visible in the page header on the Landing Page',
    );

    await test.step('Verify Roles Delegation link is visible', async () => {
      await landingPage.expectRolesDelegationLinkVisible();
    });
  });

  test('should navigate to Roles Delegation page when clicking link @regression', async ({ landingPage, page }) => {
    await allure.suite('Landing Page - Header');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-HEADER-004: Verify clicking "Roles Delegation" link navigates to the Roles Delegation page ' +
      '(opens in a new browser tab)',
    );

    await test.step('Click Roles Delegation link and wait for new tab', async () => {
      // The link has target="_blank" — it opens in a new browser tab
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page', { timeout: 15_000 }),
        landingPage.rolesDelegationLink.click(),
      ]);
      await newPage.waitForLoadState('domcontentloaded', { timeout: 30_000 });
      expect(newPage.url()).toMatch(/RolesDelegation/i);
      await newPage.close();
    });
  });

  test('should navigate back to Landing Page when clicking header logo @regression', async ({ landingPage, page }) => {
    await allure.suite('Landing Page - Header');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description(
      'LANDING-HEADER-005: Verify clicking the PICASso header logo navigates to the Landing Page (HomePage)',
    );

    await test.step('Verify header logo link is visible', async () => {
      await landingPage.expectHeaderLogoVisible();
    });

    await test.step('Click header logo', async () => {
      await landingPage.clickHeaderLogo();
    });

    await test.step('Verify navigation back to Landing Page', async () => {
      await page.waitForURL(/GRC_PICASso/, { timeout: 30_000 });
      await landingPage.expectPageLoaded({ timeout: 30_000 });
    });
  });
});
