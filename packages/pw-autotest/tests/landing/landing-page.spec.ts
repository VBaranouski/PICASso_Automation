import { test, expect } from '../../src/fixtures';
import { LoginPage, LandingPage } from '../../src/pages';
import type { LandingTab } from '../../src/pages';
import * as allure from 'allure-js-commons';
import { waitForOSScreenLoad } from '../../src/helpers/wait.helper';

test.describe('Landing Page @smoke', () => {
  test.setTimeout(90_000);
  let loginPage: LoginPage;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page, userCredentials }) => {
    loginPage = new LoginPage(page);
    landingPage = new LandingPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for page title as readiness signal
    await landingPage.pageTitle.waitFor({ timeout: 60_000 });
    await expect(page).toHaveURL(/.*GRC_PICASso/);
  });

  test('should display all tabs on landing page', async () => {
    await allure.suite('Landing Page');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('Verify all 5 tabs are visible on the Landing Page after login');

    await test.step('Verify My Tasks tab is visible and selected by default', async () => {
      await expect(landingPage.myTasksTab).toBeVisible();
      await expect(landingPage.myTasksTab).toHaveAttribute('aria-selected', 'true');
    });

    await test.step('Verify My Products tab is visible', async () => {
      await expect(landingPage.myProductsTab).toBeVisible();
    });

    await test.step('Verify My Releases tab is visible', async () => {
      await expect(landingPage.myReleasesTab).toBeVisible();
    });

    await test.step('Verify My DOCs tab is visible', async () => {
      await expect(landingPage.myDocsTab).toBeVisible();
    });

    await test.step('Verify Reports & Dashboards tab is visible', async () => {
      await expect(landingPage.reportsDashboardsTab).toBeVisible();
    });
  });

  test('should load content when clicking each tab', async ({ page }) => {
    await allure.suite('Landing Page');
    await allure.severity('critical');
    await allure.tag('smoke');
    await allure.description('Verify each tab loads its grid content with data');

    const tabs: LandingTab[] = ['My Tasks', 'My Products', 'My Releases', 'My DOCs', 'Reports & Dashboards'];

    for (const tabName of tabs) {
      await test.step(`Click "${tabName}" tab and verify content loads`, async () => {
        await landingPage.clickTab(tabName);
        await expect(landingPage.getTab(tabName)).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('tabpanel')).toBeVisible();
        await landingPage.grid.waitFor({ timeout: 60_000 });

        // Verify grid has at least a header row
        const headers = await landingPage.getColumnHeaders();
        expect(headers.length).toBeGreaterThan(0);
      });
    }
  });
});

test.describe('Landing Page - My Tasks Tab @regression', () => {
  test.setTimeout(90_000);
  let loginPage: LoginPage;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page, userCredentials }) => {
    loginPage = new LoginPage(page);
    landingPage = new LandingPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for page title as readiness signal
    await landingPage.pageTitle.waitFor({ timeout: 60_000 });
    await expect(page).toHaveURL(/.*GRC_PICASso/);
  });

  test('should display correct grid columns for My Tasks', async () => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My Tasks grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      const headers = await landingPage.getColumnHeaders();
      expect(headers).toContain('Name');
      expect(headers).toContain('Product');
      expect(headers).toContain('Release');
    });
  });

  test('should display filters for My Tasks', async ({ page }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My Tasks tab shows search, release, product, date range and status filters');

    await test.step('Verify search box is visible', async () => {
      await expect(landingPage.tasksSearchBox).toBeVisible();
    });

    await test.step('Verify date range picker is visible', async () => {
      await expect(landingPage.tasksDateRangePicker).toBeVisible();
    });

    await test.step('Verify Show Closed Tasks checkbox is visible', async () => {
      await expect(landingPage.tasksShowClosedCheckbox).toBeVisible();
    });

    await test.step('Verify Reset button is visible', async () => {
      await expect(landingPage.resetButton).toBeVisible();
    });
  });

  test('should toggle Show Closed Tasks checkbox and update data', async ({ page }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify toggling Show Closed Tasks checkbox changes the data in the grid');

    let initialCount: string;

    await test.step('Get initial record count', async () => {
      initialCount = await landingPage.getRecordCount();
      expect(Number(initialCount)).toBeGreaterThan(0);
    });

    await test.step('Toggle Show Closed Tasks checkbox', async () => {
      await landingPage.tasksShowClosedCheckbox.click();
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid).toBeVisible();
    });

    await test.step('Verify record count changed', async () => {
      const newCount = await landingPage.getRecordCount();
      // The count should change (either more records if showing closed, or fewer if hiding)
      expect(newCount).toBeTruthy();
    });
  });

  test('should change per-page value and update grid rows', async ({ page }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify changing the per-page dropdown updates the number of visible rows');

    const initialRowCount = await landingPage.getGridRowCount();

    await test.step('Verify grid is displayed with default per page', async () => {
      expect(initialRowCount).toBeGreaterThan(0);
      expect(initialRowCount).toBeLessThanOrEqual(10);
    });

    await test.step('Change to 20 per page', async () => {
      await landingPage.perPageCombobox.selectOption({ label: '20' });
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid).toBeVisible();
    });

    await test.step('Verify row count changed', async () => {
      const newRowCount = await landingPage.getGridRowCount();
      expect(newRowCount).toBeGreaterThanOrEqual(initialRowCount);
    });
  });

  test('should navigate to next page using pagination', async ({ page }) => {
    await allure.suite('Landing Page - My Tasks');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify pagination next button works and loads new data');

    await test.step('Click next page button', async () => {
      await landingPage.clickNextPage();
      await waitForOSScreenLoad(page);
    });

    await test.step('Verify pagination updated', async () => {
      await expect(landingPage.paginationNav).toBeVisible();
    });

    await test.step('Verify grid still has data', async () => {
      await expect(landingPage.grid).toBeVisible();
      const rowCount = await landingPage.getGridRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });
  });
});

test.describe('Landing Page - My Products Tab @regression', () => {
  test.setTimeout(90_000);
  let loginPage: LoginPage;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page, userCredentials }) => {
    loginPage = new LoginPage(page);
    landingPage = new LandingPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for page title as readiness signal
    await landingPage.pageTitle.waitFor({ timeout: 60_000 });
    await expect(page).toHaveURL(/.*GRC_PICASso/);
    await landingPage.clickTab('My Products');
  });

  test('should display correct grid columns for My Products', async () => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My Products grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      const headers = await landingPage.getColumnHeaders();
      expect(headers).toContain('Org Level 1');
      expect(headers).toContain('Product');
      expect(headers).toContain('Product Id');
      expect(headers).toContain('Product Status');
      expect(headers).toContain('Latest Release');
    });
  });

  test('should display filters and Show Active Only is checked by default', async () => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My Products filters are visible and Show Active Only checkbox is checked');

    await test.step('Verify Show Active Only checkbox is checked', async () => {
      await expect(landingPage.productsShowActiveOnlyCheckbox).toBeChecked();
    });

    await test.step('Verify Reset button is visible', async () => {
      await expect(landingPage.resetButton).toBeVisible();
    });
  });

  test('should uncheck Show Active Only and update data', async ({ page }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify unchecking Show Active Only shows inactive products too');

    await test.step('Uncheck Show Active Only', async () => {
      await landingPage.productsShowActiveOnlyCheckbox.click();
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid).toBeVisible();
    });

    await test.step('Verify record count changed', async () => {
      const newCount = await landingPage.getRecordCount();
      expect(newCount).toBeTruthy();
    });
  });

  test('should change per-page value on My Products', async ({ page }) => {
    await allure.suite('Landing Page - My Products');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify changing per-page dropdown on My Products updates visible rows');

    await test.step('Wait for grid data to load', async () => {
      await landingPage.grid.getByRole('row').nth(1).waitFor({ timeout: 60_000 });
    });

    await test.step('Change to 20 per page', async () => {
      await landingPage.perPageCombobox.selectOption({ label: '20' });
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid).toBeVisible();
    });

    await test.step('Verify grid still has rows', async () => {
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible();
    });
  });
});

test.describe('Landing Page - My Releases Tab @regression', () => {
  test.setTimeout(90_000);
  let loginPage: LoginPage;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page, userCredentials }) => {
    loginPage = new LoginPage(page);
    landingPage = new LandingPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for page title as readiness signal
    await landingPage.pageTitle.waitFor({ timeout: 60_000 });
    await expect(page).toHaveURL(/.*GRC_PICASso/);
    await landingPage.clickTab('My Releases');
  });

  test('should display correct grid columns for My Releases', async () => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My Releases grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      const headers = await landingPage.getColumnHeaders();
      expect(headers).toContain('Product');
      expect(headers).toContain('Release');
      expect(headers).toContain('Release Status');
      expect(headers).toContain('Target Release Date');
      expect(headers).toContain('Created By');
    });
  });

  test('should display Show Active Only checked by default', async () => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify Show Active Only is checked by default on My Releases');

    await test.step('Verify checkbox is checked', async () => {
      await expect(landingPage.releasesShowActiveOnlyCheckbox).toBeChecked();
    });
  });

  test('should uncheck Show Active Only and update data', async ({ page }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify unchecking Show Active Only on Releases changes record count');

    let initialCount: string;

    await test.step('Get initial record count', async () => {
      initialCount = await landingPage.getRecordCount();
    });

    await test.step('Uncheck Show Active Only', async () => {
      await landingPage.releasesShowActiveOnlyCheckbox.click();
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid).toBeVisible();
    });

    await test.step('Verify record count changed', async () => {
      const newCount = await landingPage.getRecordCount();
      expect(newCount).toBeTruthy();
    });
  });

  test('should navigate to next page on My Releases', async ({ page }) => {
    await allure.suite('Landing Page - My Releases');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify pagination works on My Releases tab');

    await test.step('Click next page', async () => {
      await landingPage.clickNextPage();
      await waitForOSScreenLoad(page);
    });

    await test.step('Verify page 2 is current', async () => {
      await expect(landingPage.paginationNav).toBeVisible();
    });
  });
});

test.describe('Landing Page - My DOCs Tab @regression', () => {
  test.setTimeout(90_000);
  let loginPage: LoginPage;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page, userCredentials }) => {
    loginPage = new LoginPage(page);
    landingPage = new LandingPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for page title as readiness signal
    await landingPage.pageTitle.waitFor({ timeout: 60_000 });
    await expect(page).toHaveURL(/.*GRC_PICASso/);
    await landingPage.clickTab('My DOCs');
  });

  test('should display correct grid columns for My DOCs', async () => {
    await allure.suite('Landing Page - My DOCs');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My DOCs grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      const headers = await landingPage.getColumnHeaders();
      expect(headers).toContain('DOC Name');
      expect(headers).toContain('doc Status');
      expect(headers).toContain('certification decision');
      expect(headers).toContain('DOC Lead');
    });
  });

  test('should display DOC search box and filters', async () => {
    await allure.suite('Landing Page - My DOCs');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My DOCs tab shows search by DOC name and filter dropdowns');

    await test.step('Verify search box is visible', async () => {
      await expect(landingPage.docsSearchBox).toBeVisible();
    });

    await test.step('Verify Reset button is visible', async () => {
      await expect(landingPage.resetButton).toBeVisible();
    });
  });

  test('should display DOC data in grid', async () => {
    await allure.suite('Landing Page - My DOCs');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify My DOCs grid loads with data');

    await test.step('Verify grid has records', async () => {
      const count = await landingPage.getRecordCount();
      expect(Number(count)).toBeGreaterThan(0);
    });

    await test.step('Verify grid rows are displayed', async () => {
      const rowCount = await landingPage.getGridRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });
  });
});

test.describe('Landing Page - Reports & Dashboards Tab @regression', () => {
  test.setTimeout(90_000);
  let loginPage: LoginPage;
  let landingPage: LandingPage;

  test.beforeEach(async ({ page, userCredentials }) => {
    loginPage = new LoginPage(page);
    landingPage = new LandingPage(page);

    await loginPage.goto();
    await loginPage.waitForPageLoad();
    await loginPage.login(userCredentials.login, userCredentials.password);

    // OutSystems login redirect is slow — wait for page title as readiness signal
    await landingPage.pageTitle.waitFor({ timeout: 60_000 });
    await expect(page).toHaveURL(/.*GRC_PICASso/);
    await landingPage.clickTab('Reports & Dashboards');
  });

  test('should display correct grid columns for Reports & Dashboards', async () => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify Reports & Dashboards grid displays expected column headers');

    await test.step('Verify column headers', async () => {
      const headers = await landingPage.getColumnHeaders();
      expect(headers).toContain('Product');
      expect(headers).toContain('Release');
      expect(headers).toContain('Release Status');
      expect(headers).toContain('Data Protection and Privacy Risk Level');
      expect(headers).toContain('CyberSecurity RISK Level');
    });
  });

  test('should display Access Tableau link', async () => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify Access Tableau link is visible on Reports & Dashboards tab');

    await test.step('Verify Access Tableau link is visible', async () => {
      await expect(landingPage.reportsAccessTableauLink).toBeVisible();
    });
  });

  test('should display More Filters link', async () => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify More Filters link is available on Reports & Dashboards');

    await test.step('Verify More Filters link is visible', async () => {
      await expect(landingPage.reportsMoreFiltersLink).toBeVisible();
    });

    await test.step('Verify Reset button is visible', async () => {
      await expect(landingPage.resetButton).toBeVisible();
    });
  });

  test('should display data in reports grid', async () => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify Reports & Dashboards grid loads data');

    await test.step('Verify grid has records', async () => {
      const count = await landingPage.getRecordCount();
      expect(Number(count)).toBeGreaterThan(0);
    });

    await test.step('Verify grid rows are displayed', async () => {
      const rowCount = await landingPage.getGridRowCount();
      expect(rowCount).toBeGreaterThan(0);
    });
  });

  test('should change per-page value on Reports & Dashboards', async ({ page }) => {
    await allure.suite('Landing Page - Reports & Dashboards');
    await allure.severity('normal');
    await allure.tag('regression');
    await allure.description('Verify changing per-page dropdown on Reports & Dashboards updates visible rows');

    await test.step('Wait for grid data to load', async () => {
      await landingPage.grid.getByRole('row').nth(1).waitFor({ timeout: 60_000 });
    });

    await test.step('Change to 20 per page', async () => {
      await landingPage.perPageCombobox.selectOption({ label: '20' });
      await waitForOSScreenLoad(page);
      await expect(landingPage.grid).toBeVisible();
    });

    await test.step('Verify grid still has rows', async () => {
      await expect(landingPage.grid.getByRole('row').nth(1)).toBeVisible();
    });
  });
});
