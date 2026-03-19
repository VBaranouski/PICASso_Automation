import { type Page } from '@playwright/test';

export const newProductLocators = (page: Page) => ({
  // Page header
  breadcrumb:     page.getByRole('navigation', { name: 'breadcrumb' }),
  productHeading: page.locator('main').getByText('Product Name').first(),
  productId:      page.getByText(/ID:PIC-\d+/),
  productStatus:  page.getByText('Draft'),

  // Top-level tabs
  productDetailsTab: page.getByRole('tab', { name: 'Product Details' }),
  releasesTab:       page.getByRole('tab', { name: 'Releases' }),

  // Product Related Details section
  sectionTitle:            page.getByText('PRODUCT RELATED DETAILS'),
  productNameInput:        page.getByRole('textbox', { name: 'Product Name*' }),
  productStateSelect:      page.getByRole('combobox', { name: 'Product State*' }),
  productDefinitionSelect: page.getByRole('combobox', { name: 'Product Definition*' }),
  productTypeSelect:       page.getByRole('combobox', { name: 'Product Type*' }),
  digitalOfferCheckbox:    page.getByText('Digital Offer').locator('..').getByRole('checkbox'),
  commercialRefInput:      page.getByRole('textbox', { name: 'Commercial Reference Number' }),
  dataProtectionCheckbox:  page.getByText('Data Protection & Privacy').locator('..').getByRole('checkbox'),
  brandLabelCheckbox:      page.getByText('Brand Label').locator('..').getByRole('checkbox'),

  // Product Description accordion
  productDescriptionToggle: page.getByRole('button', { name: /PRODUCT DESCRIPTION/ }),
  productDescriptionEditor: page.getByRole('textbox', { name: /Rich Text Editor/ }),

  // Bottom section tabs
  productOrganizationTab:  page.getByRole('tab', { name: /Product Organization/ }),
  productTeamTab:          page.getByRole('tab', { name: /Product Team/ }),
  securitySummaryTab:      page.getByRole('tab', { name: /Security Summary/ }),
  productConfigurationTab: page.getByRole('tab', { name: /Product Configuration/ }),

  // Product Organization fields
  orgLevel1Select:  page.getByRole('combobox', { name: 'Org Level 1*' }),
  orgLevel2Select:  page.getByRole('combobox', { name: 'Org Level 2*' }),
  orgLevel3Select:  page.getByRole('combobox', { name: /Org Level 3/ }),
  crossOrgCheckbox: page.getByText('Cross-Organizational Development').locator('..').getByRole('checkbox'),

  // Product Team display labels (visible after a person is selected)
  // Note: asterisk is CSS-generated (.mandatory class), not in text content
  productOwnerLabel:    page.getByText('Product Owner', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/),
  securityManagerLabel: page.getByText('Security Manager', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/),
  sdpaLabel:            page.getByText('Security and Data Protection Advisor', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/),
  pqlLabel:             page.getByText('Process Quality Leader', { exact: true }).locator('..').getByText(/^[A-Z][a-z]+ [A-Z]/),

  // Form action buttons
  resetFormButton: page.getByRole('button', { name: 'Reset Form' }),
  cancelButton:    page.getByRole('button', { name: 'Cancel' }),
  saveButton:      page.getByRole('button', { name: 'Save' }),

  // Post-save elements
  editProductButton:    page.getByRole('button', { name: 'Edit Product' }),
  viewHistoryLink:      page.getByRole('link', { name: /View History/ }),
  actionsManagementLink: page.getByRole('link', { name: 'Actions Management' }),
});

export type NewProductLocators = ReturnType<typeof newProductLocators>;
