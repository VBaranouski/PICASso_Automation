import { type Page } from '@playwright/test';

export const landingLocators = (page: Page) => ({
  // Header
  pageTitle:           page.locator('text=PICASso - Landing Page').first(),
  rolesDelegationLink: page.getByRole('link', { name: 'Roles Delegation' }),
  homePageMenuItem:    page.getByRole('menuitem', { name: 'Home Page' }),
  newProductButton:    page.getByRole('button', { name: 'New Product' }),
  headerLogoLink:      page.locator('a[href*="PICASso/HomePage"], a[href*="PICASso/"]').first(),
  tabPanel:            page.getByRole('tabpanel'),

  // Tabs
  tabList:               page.getByRole('tablist'),
  myTasksTab:            page.getByRole('tab', { name: 'My Tasks' }),
  myProductsTab:         page.getByRole('tab', { name: 'My Products' }),
  myReleasesTab:         page.getByRole('tab', { name: 'My Releases' }),
  myDocsTab:             page.getByRole('tab', { name: 'My DOCs' }),
  reportsDashboardsTab:  page.getByRole('tab', { name: 'Reports & Dashboards' }),

  // Common grid elements (scoped to active tabpanel)
  // Note: the per-page <select> uses numeric values (0-4) for options (10/20/30/50/100).
  // Playwright's selectOption() matches by option label text, so passing '100' works.
  // We scope to the non-hidden tabpanel to avoid hitting the previously-active panel.
  grid:               page.locator('[role="tabpanel"]:not([aria-hidden="true"])').getByRole('grid'),
  paginationStatus:   page.locator('[role="tabpanel"]:not([aria-hidden="true"])').getByRole('status'),
  perPageCombobox:    page.locator('[role="tabpanel"]:not([aria-hidden="true"])').getByRole('status').locator('select'),
  paginationNav:      page.locator('[role="tabpanel"]:not([aria-hidden="true"])').getByRole('navigation', { name: 'Pagination' }),
  nextPageButton:     page.getByRole('button', { name: 'go to next page' }),
  resetButton:        page.getByRole('button', { name: 'Reset' }),
  previousPageButton: page.getByRole('button', { name: 'go to previous page' }),

  // My Tasks filters
  tasksSearchBox:          page.getByRole('searchbox', { name: 'Search' }),
  tasksReleaseDropdown:    page.getByRole('tabpanel').locator('div').filter({ hasText: 'Release' }).first(),
  tasksProductDropdown:    page.getByRole('tabpanel').locator('div').filter({ hasText: 'Product' }).first(),
  tasksDateRangePicker:    page.getByRole('textbox', { name: 'Select a date.' }),
  tasksShowClosedCheckbox: page.getByRole('tabpanel').getByRole('checkbox'),

  // My Products filters
  productsSearchDropdown:          page.getByRole('tabpanel').getByRole('combobox').first(),
  productsProductIdDropdown:       page.getByRole('tabpanel').getByRole('combobox').nth(1),
  productsOrgLevel1Dropdown:       page.getByRole('tabpanel').getByRole('combobox').nth(2),
  productsOrgLevel2Dropdown:       page.getByRole('tabpanel').getByRole('combobox').nth(3),
  productsProductOwnerDropdown:    page.getByRole('tabpanel').getByRole('combobox').nth(4),
  productsDocLeadDropdown:         page.getByRole('tabpanel').getByRole('combobox').nth(5),
  productsShowActiveOnlyCheckbox:  page.getByRole('tabpanel').getByRole('checkbox'),

  // My Releases filters
  releasesSearchDropdown:          page.getByRole('tabpanel').getByRole('combobox').first(),
  releasesProductDropdown:         page.getByRole('tabpanel').getByRole('combobox').nth(1),
  releasesDateRangePicker:         page.getByRole('tabpanel').getByPlaceholder(''),
  releasesStatusDropdown:          page.getByRole('tabpanel').getByRole('combobox').nth(2),
  releasesShowActiveOnlyCheckbox:  page.getByRole('tabpanel').getByRole('checkbox'),

  // My DOCs filters
  docsSearchBox:            page.getByRole('searchbox', { name: 'Search by DOC name' }),
  docsProductDropdown:      page.getByRole('tabpanel').getByRole('combobox').first(),
  docsVestaIdDropdown:      page.getByRole('tabpanel').getByRole('combobox').nth(1),
  docsStatusDropdown:       page.getByRole('tabpanel').getByRole('combobox').nth(2),
  docsCertDecisionDropdown: page.getByRole('tabpanel').getByRole('combobox').nth(3),
  docsDocLeadDropdown:      page.getByRole('tabpanel').getByRole('combobox').nth(4),

  // Reports & Dashboards filters
  reportsOrgLevel1Dropdown:     page.getByRole('tabpanel').getByRole('combobox').first(),
  reportsOrgLevel2Dropdown:     page.getByRole('tabpanel').getByRole('combobox').nth(1),
  reportsOrgLevel3Dropdown:     page.getByRole('tabpanel').getByRole('combobox').nth(2),
  reportsProductDropdown:       page.getByRole('tabpanel').getByRole('combobox').nth(3),
  reportsProductTypeDropdown:   page.getByRole('tabpanel').getByRole('combobox').nth(4),
  reportsReleaseNumberDropdown: page.getByRole('tabpanel').getByRole('combobox').nth(5),
  reportsMoreFiltersLink:       page.getByRole('link', { name: 'More Filters' }),
  reportsAccessTableauLink:     page.getByRole('link', { name: 'Access Tableau' }),
});

export type LandingLocators = ReturnType<typeof landingLocators>;
