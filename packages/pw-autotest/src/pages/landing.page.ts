import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { landingLocators, type LandingLocators } from '@locators/landing.locators';
import { waitForOSScreenLoad } from '../helpers/wait.helper';

export type LandingTab = 'My Tasks' | 'My Products' | 'My Releases' | 'My DOCs' | 'Reports & Dashboards';

export class LandingPage extends BasePage {
  readonly url = '/GRC_PICASso/';

  private readonly l: LandingLocators;

  constructor(page: Page) {
    super(page);
    this.l = landingLocators(page);
  }

  // --- Public locator accessors (tests access these directly) ---

  get pageTitle(): Locator            { return this.l.pageTitle; }
  get rolesDelegationLink(): Locator  { return this.l.rolesDelegationLink; }

  get tabList(): Locator              { return this.l.tabList; }
  get myTasksTab(): Locator           { return this.l.myTasksTab; }
  get myProductsTab(): Locator        { return this.l.myProductsTab; }
  get myReleasesTab(): Locator        { return this.l.myReleasesTab; }
  get myDocsTab(): Locator            { return this.l.myDocsTab; }
  get reportsDashboardsTab(): Locator { return this.l.reportsDashboardsTab; }

  get grid(): Locator               { return this.l.grid; }
  get paginationStatus(): Locator   { return this.l.paginationStatus; }
  get perPageCombobox(): Locator    { return this.l.perPageCombobox; }
  get paginationNav(): Locator      { return this.l.paginationNav; }
  get nextPageButton(): Locator     { return this.l.nextPageButton; }
  get resetButton(): Locator        { return this.l.resetButton; }
  get previousPageButton(): Locator { return this.l.previousPageButton; }

  get tasksSearchBox(): Locator          { return this.l.tasksSearchBox; }
  get tasksReleaseDropdown(): Locator    { return this.l.tasksReleaseDropdown; }
  get tasksProductDropdown(): Locator    { return this.l.tasksProductDropdown; }
  get tasksDateRangePicker(): Locator    { return this.l.tasksDateRangePicker; }
  get tasksShowClosedCheckbox(): Locator { return this.l.tasksShowClosedCheckbox; }

  get productsSearchDropdown(): Locator          { return this.l.productsSearchDropdown; }
  get productsProductIdDropdown(): Locator       { return this.l.productsProductIdDropdown; }
  get productsOrgLevel1Dropdown(): Locator       { return this.l.productsOrgLevel1Dropdown; }
  get productsOrgLevel2Dropdown(): Locator       { return this.l.productsOrgLevel2Dropdown; }
  get productsProductOwnerDropdown(): Locator    { return this.l.productsProductOwnerDropdown; }
  get productsDocLeadDropdown(): Locator         { return this.l.productsDocLeadDropdown; }
  get productsShowActiveOnlyCheckbox(): Locator  { return this.l.productsShowActiveOnlyCheckbox; }

  get releasesSearchDropdown(): Locator          { return this.l.releasesSearchDropdown; }
  get releasesProductDropdown(): Locator         { return this.l.releasesProductDropdown; }
  get releasesDateRangePicker(): Locator         { return this.l.releasesDateRangePicker; }
  get releasesStatusDropdown(): Locator          { return this.l.releasesStatusDropdown; }
  get releasesShowActiveOnlyCheckbox(): Locator  { return this.l.releasesShowActiveOnlyCheckbox; }

  get docsSearchBox(): Locator            { return this.l.docsSearchBox; }
  get docsProductDropdown(): Locator      { return this.l.docsProductDropdown; }
  get docsVestaIdDropdown(): Locator      { return this.l.docsVestaIdDropdown; }
  get docsStatusDropdown(): Locator       { return this.l.docsStatusDropdown; }
  get docsCertDecisionDropdown(): Locator { return this.l.docsCertDecisionDropdown; }
  get docsDocLeadDropdown(): Locator      { return this.l.docsDocLeadDropdown; }

  get reportsOrgLevel1Dropdown(): Locator     { return this.l.reportsOrgLevel1Dropdown; }
  get reportsOrgLevel2Dropdown(): Locator     { return this.l.reportsOrgLevel2Dropdown; }
  get reportsOrgLevel3Dropdown(): Locator     { return this.l.reportsOrgLevel3Dropdown; }
  get reportsProductDropdown(): Locator       { return this.l.reportsProductDropdown; }
  get reportsProductTypeDropdown(): Locator   { return this.l.reportsProductTypeDropdown; }
  get reportsReleaseNumberDropdown(): Locator { return this.l.reportsReleaseNumberDropdown; }
  get reportsMoreFiltersLink(): Locator       { return this.l.reportsMoreFiltersLink; }
  get reportsAccessTableauLink(): Locator     { return this.l.reportsAccessTableauLink; }

  // --- Tab navigation ---

  async clickTab(tabName: LandingTab): Promise<void> {
    const tab = this.getTab(tabName);
    await tab.click();
    await this.l.grid.getByRole('columnheader').first().waitFor({ timeout: 30_000 });
  }

  getTab(tabName: LandingTab): Locator {
    switch (tabName) {
      case 'My Tasks':              return this.l.myTasksTab;
      case 'My Products':           return this.l.myProductsTab;
      case 'My Releases':           return this.l.myReleasesTab;
      case 'My DOCs':               return this.l.myDocsTab;
      case 'Reports & Dashboards':  return this.l.reportsDashboardsTab;
    }
  }

  // --- Grid helpers ---

  async getRecordCount(): Promise<string> {
    const statusText = await this.l.paginationStatus.textContent();
    const match = statusText?.match(/(\d+)\s*records/);
    return match ? match[1] : '0';
  }

  async getGridRowCount(): Promise<number> {
    const total = await this.l.grid.getByRole('row').count();
    return total - 1; // subtract header row
  }

  async changePerPage(value: '10' | '20' | '30' | '50' | '100'): Promise<void> {
    await this.l.perPageCombobox.selectOption(value);
    await waitForOSScreenLoad(this.page);
    await expect(this.l.grid).toBeVisible({ timeout: 30_000 });
  }

  async clickNextPage(): Promise<void> {
    await this.l.nextPageButton.click();
  }

  async clickResetFilters(): Promise<void> {
    await this.l.resetButton.click();
  }

  async getColumnHeaders(): Promise<string[]> {
    const headers = this.l.grid.getByRole('columnheader');
    return headers.allTextContents();
  }

  async clickPreviousPage(): Promise<void> {
    await this.l.previousPageButton.click();
  }

  async getCurrentPageNumber(): Promise<number> {
    const currentPageButton = this.l.paginationNav.getByRole('button', { name: /current page/ });
    const text = await currentPageButton.textContent();
    return Number(text?.trim() || '0');
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.l.paginationNav.getByRole('button', { name: `go to page ${pageNumber}` }).click();
  }

  // --- My Products — vscomp combobox search helpers ---
  // OutSystems vscomp dropdown renders its listbox at the root DOM level (outside tabpanel).
  // After clicking the combobox, the active search input gets focus.

  async searchAndSelectProductByName(query: string, optionPattern: RegExp): Promise<void> {
    await this.l.productsSearchDropdown.click();
    const searchInput = this.page.locator('.vscomp-search-input:focus');
    await searchInput.waitFor({ timeout: 30_000 });
    await searchInput.pressSequentially(query, { delay: 150 });
    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await option.waitFor({ timeout: 30_000 });
    await option.click();
    await waitForOSScreenLoad(this.page);
  }

  async searchAndSelectProductById(query: string, optionPattern: RegExp): Promise<void> {
    await this.l.productsProductIdDropdown.click();
    const searchInput = this.page.locator('.vscomp-search-input:focus');
    await searchInput.waitFor({ timeout: 30_000 });
    await searchInput.pressSequentially(query, { delay: 150 });
    const option = this.page.getByRole('option', { name: optionPattern }).first();
    await option.waitFor({ timeout: 60_000 });
    await option.click();
    await waitForOSScreenLoad(this.page);
  }

  // --- My Products — grid row helpers ---

  getFirstProductLink(): Locator {
    return this.l.grid.getByRole('row').nth(1).getByRole('link').first();
  }

  async getFirstProductName(): Promise<string> {
    const link = this.getFirstProductLink();
    return (await link.textContent())?.trim() || '';
  }

  async clickFirstProduct(): Promise<void> {
    const link = this.getFirstProductLink();
    await link.click();
    await waitForOSScreenLoad(this.page);
  }

  async toggleShowActiveOnly(): Promise<void> {
    await this.l.productsShowActiveOnlyCheckbox.click();
    await waitForOSScreenLoad(this.page);
    await expect(this.l.grid).toBeVisible({ timeout: 30_000 });
  }

  async toggleTasksShowClosed(): Promise<void> {
    await this.l.tasksShowClosedCheckbox.click();
    await waitForOSScreenLoad(this.page);
    await expect(this.l.grid).toBeVisible({ timeout: 30_000 });
  }

  async toggleReleasesShowActiveOnly(): Promise<void> {
    await this.l.releasesShowActiveOnlyCheckbox.click();
    await waitForOSScreenLoad(this.page);
    await expect(this.l.grid).toBeVisible({ timeout: 30_000 });
  }

  async resetFilters(): Promise<void> {
    await this.l.resetButton.click();
    await waitForOSScreenLoad(this.page);
    await expect(this.l.grid).toBeVisible({ timeout: 30_000 });
  }

  async clickNewProduct(): Promise<void> {
    await this.l.newProductButton.waitFor({ state: 'visible', timeout: 120_000 });
    await this.l.newProductButton.click();
  }

  // --- Assertions ---

  async expectPageLoaded(options?: { timeout?: number }): Promise<void> {
    const timeout = options?.timeout ?? 60_000;
    await this.l.pageTitle.waitFor({ timeout });
    await expect(this.page).toHaveURL(/.*GRC_PICASso/, { timeout });
  }

  async expectUserDisplayed(login: string): Promise<void> {
    await expect(this.page.getByText(login, { exact: true }).first()).toBeVisible();
  }

  async expectNavigationMenuVisible(): Promise<void> {
    await expect(this.l.homePageMenuItem).toBeVisible();
  }

  async expectTabsPresent(): Promise<void> {
    await expect(this.l.myTasksTab).toBeVisible();
    await expect(this.l.myProductsTab).toBeVisible();
    await expect(this.l.myReleasesTab).toBeVisible();
  }

  async expectTabsVisible(): Promise<void> {
    await expect(this.l.myTasksTab).toBeVisible();
    await expect(this.l.myProductsTab).toBeVisible();
    await expect(this.l.myReleasesTab).toBeVisible();
    await expect(this.l.myDocsTab).toBeVisible();
    await expect(this.l.reportsDashboardsTab).toBeVisible();
  }

  async expectTabActive(tab: LandingTab): Promise<void> {
    await expect(this.getTab(tab)).toHaveAttribute('aria-selected', 'true');
  }

  async expectTabpanelVisible(): Promise<void> {
    await expect(this.l.tabPanel).toBeVisible();
  }

  async expectGridVisible(): Promise<void> {
    await expect(this.l.grid).toBeVisible();
  }

  async expectColumnHeadersExist(): Promise<void> {
    const headers = await this.getColumnHeaders();
    expect(headers.length).toBeGreaterThan(0);
  }

  async expectColumnHeadersContain(expected: string[]): Promise<void> {
    const headers = await this.getColumnHeaders();
    for (const header of expected) {
      expect(headers).toContain(header);
    }
  }

  async expectGridHasRows(): Promise<void> {
    const rowCount = await this.getGridRowCount();
    expect(rowCount).toBeGreaterThan(0);
  }

  async expectRecordCountGreaterThan(n: number): Promise<void> {
    const count = await this.getRecordCount();
    expect(Number(count)).toBeGreaterThan(n);
  }

  async expectRecordCountLessThan(n: number, timeout = 30_000): Promise<void> {
    await expect.poll(
      async () => Number(await this.getRecordCount()),
      { timeout },
    ).toBeLessThan(n);
  }

  async expectDefaultPageSize(): Promise<number> {
    const rowCount = await this.getGridRowCount();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(10);
    return rowCount;
  }

  async expectRowCountAtLeast(n: number): Promise<void> {
    const rowCount = await this.getGridRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(n);
  }

  async expectCurrentPageNumber(expected: number): Promise<void> {
    const currentPage = await this.getCurrentPageNumber();
    expect(currentPage).toBe(expected);
  }

  async expectTasksFiltersVisible(): Promise<void> {
    await expect(this.l.tasksSearchBox).toBeVisible();
    await expect(this.l.tasksDateRangePicker).toBeVisible();
    await expect(this.l.tasksShowClosedCheckbox).toBeVisible();
    await expect(this.l.resetButton).toBeVisible();
  }

  async expectProductsShowActiveOnlyChecked(): Promise<void> {
    await expect(this.l.productsShowActiveOnlyCheckbox).toBeChecked();
  }

  async expectProductsShowActiveOnlyUnchecked(): Promise<void> {
    await expect(this.l.productsShowActiveOnlyCheckbox).not.toBeChecked();
  }

  async expectReleasesShowActiveOnlyChecked(): Promise<void> {
    await expect(this.l.releasesShowActiveOnlyCheckbox).toBeChecked();
  }

  async expectDocsFiltersVisible(): Promise<void> {
    await expect(this.l.docsSearchBox).toBeVisible();
    await expect(this.l.resetButton).toBeVisible();
  }

  async expectAccessTableauLinkVisible(): Promise<void> {
    await expect(this.l.reportsAccessTableauLink).toBeVisible();
  }

  async expectMoreFiltersLinkVisible(): Promise<void> {
    await expect(this.l.reportsMoreFiltersLink).toBeVisible();
  }

  async expectResetButtonVisible(): Promise<void> {
    await expect(this.l.resetButton).toBeVisible();
  }
}
