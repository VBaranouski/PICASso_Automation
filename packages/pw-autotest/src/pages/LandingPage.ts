import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { waitForOSScreenLoad } from '../helpers/wait.helper';

export type LandingTab = 'My Tasks' | 'My Products' | 'My Releases' | 'My DOCs' | 'Reports & Dashboards';

export class LandingPage extends BasePage {
  readonly url = '/GRC_PICASso/';

  // Header
  readonly pageTitle: Locator;
  readonly rolesDelegationLink: Locator;

  // Tabs
  readonly tabList: Locator;
  readonly myTasksTab: Locator;
  readonly myProductsTab: Locator;
  readonly myReleasesTab: Locator;
  readonly myDocsTab: Locator;
  readonly reportsDashboardsTab: Locator;

  // Common grid elements
  readonly grid: Locator;
  readonly paginationStatus: Locator;
  readonly perPageCombobox: Locator;
  readonly paginationNav: Locator;
  readonly nextPageButton: Locator;
  readonly resetButton: Locator;

  // My Tasks filters
  readonly tasksSearchBox: Locator;
  readonly tasksReleaseDropdown: Locator;
  readonly tasksProductDropdown: Locator;
  readonly tasksDateRangePicker: Locator;
  readonly tasksShowClosedCheckbox: Locator;

  // My Products filters
  readonly productsSearchDropdown: Locator;
  readonly productsProductIdDropdown: Locator;
  readonly productsOrgLevel1Dropdown: Locator;
  readonly productsOrgLevel2Dropdown: Locator;
  readonly productsProductOwnerDropdown: Locator;
  readonly productsDocLeadDropdown: Locator;
  readonly productsShowActiveOnlyCheckbox: Locator;
  readonly previousPageButton: Locator;

  // My Releases filters
  readonly releasesSearchDropdown: Locator;
  readonly releasesProductDropdown: Locator;
  readonly releasesDateRangePicker: Locator;
  readonly releasesStatusDropdown: Locator;
  readonly releasesShowActiveOnlyCheckbox: Locator;

  // My DOCs filters
  readonly docsSearchBox: Locator;
  readonly docsProductDropdown: Locator;
  readonly docsVestaIdDropdown: Locator;
  readonly docsStatusDropdown: Locator;
  readonly docsCertDecisionDropdown: Locator;
  readonly docsDocLeadDropdown: Locator;

  // Reports & Dashboards filters
  readonly reportsOrgLevel1Dropdown: Locator;
  readonly reportsOrgLevel2Dropdown: Locator;
  readonly reportsOrgLevel3Dropdown: Locator;
  readonly reportsProductDropdown: Locator;
  readonly reportsProductTypeDropdown: Locator;
  readonly reportsReleaseNumberDropdown: Locator;
  readonly reportsMoreFiltersLink: Locator;
  readonly reportsAccessTableauLink: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.pageTitle = page.locator('text=PICASso - Landing Page').first();
    this.rolesDelegationLink = page.getByRole('link', { name: 'Roles Delegation' });

    // Tabs
    this.tabList = page.getByRole('tablist');
    this.myTasksTab = page.getByRole('tab', { name: 'My Tasks' });
    this.myProductsTab = page.getByRole('tab', { name: 'My Products' });
    this.myReleasesTab = page.getByRole('tab', { name: 'My Releases' });
    this.myDocsTab = page.getByRole('tab', { name: 'My DOCs' });
    this.reportsDashboardsTab = page.getByRole('tab', { name: 'Reports & Dashboards' });

    // Common grid elements (scoped to active tabpanel)
    this.grid = page.getByRole('tabpanel').getByRole('grid');
    this.paginationStatus = page.getByRole('tabpanel').getByRole('status');
    this.perPageCombobox = page.getByRole('tabpanel').getByRole('status').getByRole('combobox');
    this.paginationNav = page.getByRole('tabpanel').getByRole('navigation', { name: 'Pagination' });
    this.nextPageButton = page.getByRole('button', { name: 'go to next page' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.previousPageButton = page.getByRole('button', { name: 'go to previous page' });

    // My Tasks filters
    this.tasksSearchBox = page.getByRole('searchbox', { name: 'Search' });
    this.tasksReleaseDropdown = page.getByRole('tabpanel').locator('div').filter({ hasText: 'Release' }).first();
    this.tasksProductDropdown = page.getByRole('tabpanel').locator('div').filter({ hasText: 'Product' }).first();
    this.tasksDateRangePicker = page.getByRole('textbox', { name: 'Select a date.' });
    this.tasksShowClosedCheckbox = page.getByRole('tabpanel').getByRole('checkbox');

    // My Products filters
    this.productsSearchDropdown = page.getByRole('tabpanel').getByRole('combobox').first();
    this.productsProductIdDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(1);
    this.productsOrgLevel1Dropdown = page.getByRole('tabpanel').getByRole('combobox').nth(2);
    this.productsOrgLevel2Dropdown = page.getByRole('tabpanel').getByRole('combobox').nth(3);
    this.productsProductOwnerDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(4);
    this.productsDocLeadDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(5);
    this.productsShowActiveOnlyCheckbox = page.getByRole('tabpanel').getByRole('checkbox');

    // My Releases filters
    this.releasesSearchDropdown = page.getByRole('tabpanel').getByRole('combobox').first();
    this.releasesProductDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(1);
    this.releasesDateRangePicker = page.getByRole('tabpanel').getByPlaceholder('');
    this.releasesStatusDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(2);
    this.releasesShowActiveOnlyCheckbox = page.getByRole('tabpanel').getByRole('checkbox');

    // My DOCs filters
    this.docsSearchBox = page.getByRole('searchbox', { name: 'Search by DOC name' });
    this.docsProductDropdown = page.getByRole('tabpanel').getByRole('combobox').first();
    this.docsVestaIdDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(1);
    this.docsStatusDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(2);
    this.docsCertDecisionDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(3);
    this.docsDocLeadDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(4);

    // Reports & Dashboards filters
    this.reportsOrgLevel1Dropdown = page.getByRole('tabpanel').getByRole('combobox').first();
    this.reportsOrgLevel2Dropdown = page.getByRole('tabpanel').getByRole('combobox').nth(1);
    this.reportsOrgLevel3Dropdown = page.getByRole('tabpanel').getByRole('combobox').nth(2);
    this.reportsProductDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(3);
    this.reportsProductTypeDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(4);
    this.reportsReleaseNumberDropdown = page.getByRole('tabpanel').getByRole('combobox').nth(5);
    this.reportsMoreFiltersLink = page.getByRole('link', { name: 'More Filters' });
    this.reportsAccessTableauLink = page.getByRole('link', { name: 'Access Tableau' });
  }

  // Tab navigation
  async clickTab(tabName: LandingTab): Promise<void> {
    const tab = this.getTab(tabName);
    await tab.click();
    await this.grid.getByRole('columnheader').first().waitFor({ timeout: 30_000 });
  }

  getTab(tabName: LandingTab): Locator {
    switch (tabName) {
      case 'My Tasks': return this.myTasksTab;
      case 'My Products': return this.myProductsTab;
      case 'My Releases': return this.myReleasesTab;
      case 'My DOCs': return this.myDocsTab;
      case 'Reports & Dashboards': return this.reportsDashboardsTab;
    }
  }

  // Grid helpers
  async getRecordCount(): Promise<string> {
    const statusText = await this.paginationStatus.textContent();
    const match = statusText?.match(/(\d+)\s*records/);
    return match ? match[1] : '0';
  }

  async getGridRowCount(): Promise<number> {
    const total = await this.grid.getByRole('row').count();
    return total - 1; // subtract header row
  }

  async changePerPage(value: '10' | '20' | '30' | '50' | '100'): Promise<void> {
    await this.perPageCombobox.selectOption(value);
  }

  async clickNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  async clickResetFilters(): Promise<void> {
    await this.resetButton.click();
  }

  // Grid column headers
  async getColumnHeaders(): Promise<string[]> {
    const headers = this.grid.getByRole('columnheader');
    return headers.allTextContents();
  }

  // Pagination
  async clickPreviousPage(): Promise<void> {
    await this.previousPageButton.click();
  }

  async getCurrentPageNumber(): Promise<number> {
    const currentPageButton = this.paginationNav.getByRole('button', { name: /current page/ });
    const text = await currentPageButton.textContent();
    return Number(text?.trim() || '0');
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.paginationNav.getByRole('button', { name: `go to page ${pageNumber}` }).click();
  }

  // My Products — combobox search helpers
  // OutSystems combobox widgets require click-to-open, then pressSequentially for search
  /**
   * Open the product name combobox, type a search query, and select a matching option.
   * The vscomp dropdown renders a listbox at the root DOM level (outside tabpanel).
   */
  async searchAndSelectProductByName(query: string, optionPattern: RegExp): Promise<void> {
    await this.productsSearchDropdown.click();
    // Each vscomp combobox has its own search input — after click, the active one gets focus
    const searchInput = this.page.locator('.vscomp-search-input:focus');
    await searchInput.waitFor({ timeout: 30_000 });
    await searchInput.pressSequentially(query, { delay: 150 });
    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await option.waitFor({ timeout: 30_000 });
    await option.click();
    await waitForOSScreenLoad(this.page);
  }

  /**
   * Open the product ID combobox, type a search query, and select a matching option.
   */
  async searchAndSelectProductById(query: string, optionPattern: RegExp): Promise<void> {
    await this.productsProductIdDropdown.click();
    const searchInput = this.page.locator('.vscomp-search-input:focus');
    await searchInput.waitFor({ timeout: 30_000 });
    await searchInput.pressSequentially(query, { delay: 150 });
    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await option.waitFor({ timeout: 60_000 });
    await option.click();
    await waitForOSScreenLoad(this.page);
  }

  // Get first product link in the grid
  getFirstProductLink(): Locator {
    return this.grid.getByRole('row').nth(1).getByRole('link').first();
  }

  async getFirstProductName(): Promise<string> {
    const link = this.getFirstProductLink();
    return (await link.textContent())?.trim() || '';
  }

  async clickFirstProduct(): Promise<void> {
    const link = this.getFirstProductLink();
    await link.click();
  }

  // Toggle Show Active Only checkbox and wait for grid refresh
  async toggleShowActiveOnly(): Promise<void> {
    await this.productsShowActiveOnlyCheckbox.click();
    await waitForOSScreenLoad(this.page);
    await expect(this.grid).toBeVisible({ timeout: 30_000 });
  }

  // Reset filters and wait for grid refresh
  async resetFilters(): Promise<void> {
    await this.resetButton.click();
    await waitForOSScreenLoad(this.page);
    await expect(this.grid).toBeVisible({ timeout: 30_000 });
  }
}
