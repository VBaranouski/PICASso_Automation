import { type Page } from '@playwright/test';

export const docDetailsLocators = (page: Page) => ({
  // --- DOC Details page header ---
  // DOC ID format is DOC-NNN (varies by environment size); use flexible digit match
  docIdHeader:              page.getByText(/^DOC-\d+/),
  vestaIdHeaderValue:       page.getByText(/VESTA ID/).locator('..').getByText(/\d+/).first(),
  releaseHeaderLink:        page.getByText(/Release/).locator('..').getByRole('link').first(),
  releaseHeaderText:        page.getByText(/Release/).locator('..'),
  targetReleaseDateHeader:  page.getByText(/Target Release Date/).locator('..'),

  // --- DOC status badge and current stage ---
  // DOC status/stage markup differs between Product Detail and DOC Detail pages,
  // so keep the locators text-driven and scoped away from dialogs where possible.
  docStatusBadge:  page.getByText(/^Controls Scoping$/, { exact: true }).first(),
  docStageLabel:   page.getByRole('tab', { name: 'Scope ITS Controls', exact: true }),

  // --- Initiate DOC action (on Digital Offer Certification tab) ---
  initiateDOCButton: page.getByRole('button', { name: 'Initiate DOC' }),

  // --- Initiate DOC Modal fields (dialog that opens after clicking Initiate DOC) ---
  initiateDocModal:            page.getByRole('dialog'),
  modalDocNameInput:           page.getByRole('dialog').getByRole('textbox', { name: 'DOC Name*' }),
  modalVestaIdButton:          page.getByRole('dialog').getByRole('button', { name: 'Select an option' }),
  modalReleaseCombobox:        page.getByRole('dialog').getByRole('combobox', { name: 'Release*' }),
  // Visible only when "Other Release" is selected:
  modalReleaseVersionInput:    page.getByRole('dialog').getByRole('textbox', { name: 'Release Version*' }),
  modalTargetReleaseDateInput: page.getByRole('dialog').getByRole('textbox', { name: 'Select a date.' }),
  modalDocReasonInput:         page.getByRole('dialog').getByRole('textbox', { name: 'DOC Reason*' }),
  modalInitiateButton:         page.getByRole('dialog').getByRole('button', { name: 'Initiate DOC' }),
  modalCancelButton:           page.getByRole('dialog').getByRole('button', { name: 'Cancel' }),
  // Calendar that opens outside the dialog when date input is clicked:
  calendarMonthSelect:         page.getByRole('combobox', { name: 'Month' }),
  calendarYearSpinbutton:      page.getByRole('spinbutton', { name: 'Year' }),

  // --- DOC Details tabs (after initiation, all three are clickable) ---
  digitalOfferDetailsTab:   page.getByRole('tab', { name: 'Digital Offer Details' }),
  rolesResponsibilitiesTab: page.getByRole('tab', { name: 'Roles & Responsibilities' }),
  itsChecklistTab:          page.getByRole('tab', { name: 'ITS Checklist' }),
  actionPlanTab:           page.getByRole('tab', { name: 'Action Plan' }),
  riskSummaryTab:          page.getByRole('tab', { name: 'Risk Summary', exact: true }),
  certificationDecisionTab: page.getByRole('tab', { name: 'Certification Decision' }),

  // --- Digital Offer Details tab panel content ---
  digitalOfferDetailsPanel: page.getByRole('tabpanel').filter({ has: page.getByText('DOC Reason') }).first(),

  // --- DOC flow stage tabs (Initiate DOC tab shows initiator + date after completion) ---
  // The "Initiate DOC" flow tab contains the initiator username and date underneath
  initiateStageContainer: page.getByRole('tab', { name: 'Initiate DOC' }),

  // --- Cancel DOC button (visible in header for users with cancel privilege) ---
  cancelDocButton: page.getByRole('button', { name: 'Cancel DOC' }),

  // --- First DOC link in the certification table (on Product Detail page) ---
  // Scope to the Digital Offer Certification grid and then to the row in Controls Scoping status.
  certificationGrid: page.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'DOC ID' }) }).first(),
  controlsScopingCertificationRow: page.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'DOC ID' }) }).first()
    .getByRole('row').filter({ hasText: /Controls Scoping/ }).first(),
  firstDocTableLink: page.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'DOC ID' }) }).first()
    .getByRole('row').filter({ hasText: /Controls Scoping/ }).first()
    .getByRole('link').first(),
  productTableStatusCell: page.getByRole('grid').filter({ has: page.getByRole('columnheader', { name: 'DOC ID' }) }).first()
    .getByRole('gridcell', { name: 'Controls Scoping' }).first(),

  // --- Digital Offer Certifications table (on Product Detail page) ---
  // The DOC table on Product Detail uses proper ARIA grid/row/gridcell roles.
  certificationTableRow: (docId: string) =>
    page.getByRole('row').filter({ hasText: docId }),
  startDateCellByDocId: (docId: string) =>
    page.getByRole('row').filter({ hasText: docId })
      .getByRole('gridcell').filter({ hasText: /\d{2} \w{3} \d{4}|^\s*$/ }).first(),

  // ─── DOC Detail — Breadcrumb ──────────────────────────────────────────────
  // The breadcrumb renders as a list of links; on the DOC Detail page the chain is
  // Home → <Product Name> → DOC: <DOC Name>
  breadcrumbHomeLink:    page.getByRole('link', { name: 'Home' }).first(),
  // Nth link in the breadcrumb navigation element (product name is usually 2nd)
  breadcrumbProductLink: page.locator('[class*="breadcrumb"] a, nav[aria-label*="breadcrumb"] a').nth(1),
  // Last non-link segment (current DOC name, not a link)
  breadcrumbDocCurrentText: page.locator('[class*="breadcrumb"] [aria-current], [class*="breadcrumb"] li:last-child').first(),

  // ─── DOC Detail — Pipeline stages 3-5 (1 = initiateStageContainer, 2 = docStageLabel) ──
  docPipelineTab3: page.getByRole('tab', { name: /Risk Assessment/ }),
  docPipelineTab4: page.getByRole('tab', { name: /Risk Summary/ }),
  docPipelineTab5: page.getByRole('tab', { name: /Issue Certification/ }),

  // Toggle that hides / shows the 5-stage pipeline flow header
  // DOM: DIV.expandable-area--toggle containing a SPAN with 'Hide Flow' or 'Show Flow'
  hideShowFlowButton: page.locator('.expandable-area--toggle').first(),

  // ─── DOC Detail — Digital Offer Details tab — edit mode ──────────────────
  editDetailsButton:       page.getByRole('button', { name: 'Edit Details' }),
  // Fields become visible after clicking Edit Details
  offerDocNameInput:       page.getByRole('tabpanel').getByRole('textbox', { name: /DOC Name/ }).first(),
  offerDocReasonTextarea:  page.getByRole('tabpanel').getByRole('textbox', { name: /DOC Reason/ }).first(),
  // Character counter typically renders as "NN/500"
  offerDocReasonCharCount: page.getByRole('tabpanel').getByText(/\/500/).first(),
  offerReleaseDropdown:    page.getByRole('tabpanel').getByRole('combobox', { name: /Release/ }).first(),
  offerReleaseVersionInput: page.getByRole('tabpanel').getByRole('textbox', { name: /Release Version/ }).first(),
  // Save / Cancel buttons scoped to tabpanel to avoid conflict with modal buttons
  saveChangesButton:        page.getByRole('tabpanel').getByRole('button', { name: 'Save Changes' }).first(),
  cancelEditButton:         page.getByRole('tabpanel').getByRole('button', { name: 'Cancel' }).first(),

  // ─── DOC Detail — Roles & Responsibilities tab ───────────────────────────
  // The Roles grid occupies the entire Roles & Responsibilities tabpanel
  rolesTabPanel: page.getByRole('tabpanel').filter({ has: page.getByText('USER ROLE') }).first(),
  // Roles grid uses actual <table> element, not role="grid"
  rolesGrid:     page.getByRole('tabpanel').filter({ has: page.getByText('USER ROLE') }).locator('table').first(),
  editRolesButton:       page.getByRole('button', { name: 'Edit Roles' }),
  saveRolesChangesButton: page.getByRole('button', { name: 'Save Changes' }),
  cancelRolesButton:     page.getByRole('tabpanel').filter({ has: page.getByText('USER ROLE') }).getByRole('button', { name: 'Cancel' }).first(),
  // Orange dot indicator on the tab label when a mandatory role has no member
  rolesTabWarningIndicator: page.getByRole('tab', { name: 'Roles & Responsibilities' }).locator('[class*="dot"], [class*="warning"], [class*="badge"]').first(),

  // ─── DOC Detail — ITS Checklist tab ──────────────────────────────────────
  itsChecklistPanel:          page.getByRole('tabpanel').filter({ has: page.getByText('IT SECURITY CONTROLS') }).first(),
  itsSecurityControlsTitle:   page.getByText('IT SECURITY CONTROLS'),
  // ITS grid uses actual <table> element, not role="grid"
  itsGrid: page.getByRole('tabpanel').filter({ has: page.getByText('IT SECURITY CONTROLS') }).locator('table').first(),
  itsSearchInput:   page.getByRole('tabpanel').filter({ has: page.getByText('IT SECURITY CONTROLS') }).getByRole('searchbox').first(),
  itsCategoryFilter: page.getByRole('tabpanel').filter({ has: page.getByText('IT SECURITY CONTROLS') }).getByRole('combobox').first(),
  itsResetButton:   page.getByRole('tabpanel').filter({ has: page.getByText('IT SECURITY CONTROLS') }).getByRole('button', { name: 'Reset' }).first(),
  // Add Controls button uses '+ Add Controls' (plural)
  itsAddControlButton:          page.getByRole('button', { name: '+ Add Controls' }),
  itsNoResultsMessage:          page.getByText('No results found').first(),
  itsNoControlsAddedMessage:    page.getByText('No ITS Controls added yet'),
  itsNoActiveControlsMessage:   page.getByText(/No active ITS Controls for this product/),
  // Factory: get a row in the ITS grid by 0-based data row index (row 0 = first data row, skips header)
  // ITS grid uses <table> with <tr>, not role="grid"
  itsGridDataRow: (dataRowIndex: number) =>
    page.getByRole('tabpanel').filter({ has: page.getByText('IT SECURITY CONTROLS') })
      .locator('table').locator('tbody tr').nth(dataRowIndex),

  // ─── DOC Detail — Add Control popup ──────────────────────────────────────
  // Dialog title is 'Add Controls' (plural)
  addControlPopup:           page.getByRole('dialog').filter({ has: page.getByText('Add Controls') }).first(),
  addControlSearchInput:     page.getByRole('dialog').getByRole('searchbox').first(),
  addControlCategoryFilter:  page.getByRole('dialog').getByRole('combobox').first(),
  addControlShowNewToggle:   page.getByRole('dialog').getByRole('checkbox').first(),
  // Add Controls table uses actual <table> not role="grid"
  addControlTable:           page.getByRole('dialog').locator('table').first(),
  // Selected count uses lowercase: '0 of 27 selected'
  addControlSelectedCount:   page.getByRole('dialog').getByText(/\d+ of \d+ selected/i),
  addSelectedButton:         page.getByRole('dialog').getByRole('button', { name: 'Add Selected' }),
  addControlCloseButton:     page.getByRole('dialog').getByRole('button', { name: /Cancel/ }).first(),
  addControlNoResultsMessage: page.getByRole('dialog').getByText('No results found'),

  // ─── DOC Detail — Action Plan tab ────────────────────────────────────────
  actionPlanPanel:             page.getByRole('tabpanel').filter({ has: page.getByText('ACTION PLAN') }).first(),
  actionPlanTitle:             page.getByText('ACTION PLAN').first(),
  actionPlanSearchInput:       page.getByRole('tabpanel').getByRole('searchbox', { name: 'Search' }).first(),
  actionPlanShowOpenOnly:      page.getByRole('tabpanel').getByRole('checkbox', { name: 'Show open only' }).first(),
  actionPlanResetButton:       page.getByRole('tabpanel').getByRole('button', { name: 'Reset' }).first(),
  actionPlanGrid:              page.getByRole('tabpanel').getByRole('grid').first(),
  actionPlanDataRows:          page.getByRole('tabpanel').getByRole('grid').first().getByRole('row').filter({ has: page.locator('td') }),
  actionPlanNoResultsMessage:  page.getByRole('tabpanel').getByText('No results found').first(),

  // ─── DOC Detail — Risk Summary tab ───────────────────────────────────────
  riskSummaryPanel:             page.getByRole('tabpanel').filter({ has: page.getByText('SDL FCSR Summary') }).first(),
  riskSummarySdlTitle:          page.getByRole('tabpanel').getByText('SDL FCSR Summary').first(),
  riskSummaryPrivacyTitle:      page.getByRole('tabpanel').getByText('Data Protection and Privacy Summary').first(),
  riskSummaryItsTitle:          page.getByRole('tabpanel').getByText('ITS CONTROL SUMMARY').first(),
  riskSummaryControlsTitle:     page.getByRole('tabpanel').getByText('CONTROLS').first(),
  riskSummarySdlDecisionLabel:  page.getByRole('tabpanel').getByText('FCSR Decision').first(),
  riskSummarySdlCommentsLabel:  page.getByRole('tabpanel').getByText('Comments').first(),
  riskSummarySdlLinkLabel:      page.getByRole('tabpanel').getByText('For more details, please refer to the').first(),
  riskSummaryPrivacyDecisionLabel: page.getByRole('tabpanel').getByText('PCC Decision').first(),
  riskSummaryPrivacyCommentsLabel: page.getByRole('tabpanel').getByText('For more details, please refer to the').nth(1),
  riskSummaryPrivacyLinkLabel:  page.getByRole('tabpanel').getByText('Data Protection and Privacy section').first(),
  riskSummaryOverallRiskLabel:  page.getByRole('tabpanel').getByText('Overall Risk Assessment').first(),
  riskSummaryItsCommentLabel:   page.getByRole('tabpanel').getByText('Comment').first(),
  riskSummaryLinks:             page.getByRole('tabpanel').filter({ has: page.getByText('SDL FCSR Summary') }).first().getByRole('link'),
  riskSummaryNoResultsMessage:  page.getByRole('tabpanel').filter({ has: page.getByText('SDL FCSR Summary') }).first().getByText('No results found').first(),

  // ─── DOC Detail — Unscope (Descope) ITS Control popup ───────────────────
  // Dialog title is 'Descope ITS Control' — not a heading role, just text
  unscopePopupHeading:      page.getByRole('dialog').getByText('Descope ITS Control').first(),
  // Justification field has label 'Justification*' (with asterisk)
  unscopeJustificationInput: page.getByRole('dialog').getByRole('textbox', { name: 'Justification*' }).first(),
  unscopeDescoperButton:     page.getByRole('dialog').getByRole('button', { name: 'Descope' }),
  unscopePopupCancelButton:  page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).first(),

  // ─── DOC Detail — View History ────────────────────────────────────────────
  viewHistoryLink:       page.getByRole('link', { name: /View History/ }).first(),
  historyDialog:         page.getByRole('dialog').filter({ has: page.getByText('DOC History') }).first(),
  historySearchInput:    page.getByRole('dialog').getByRole('searchbox').first(),
  // Activity filter is a native <select> element (Playwright exposes it as combobox)
  historyActivityFilter: page.getByRole('dialog').getByRole('combobox', { name: 'Activity' }).first(),
  // Date range: flatpickr keeps the original input hidden and renders visible text inputs with aria-label 'Select a date.'
  historyDateFromInput:  page.getByRole('dialog').getByRole('textbox', { name: 'Select a date.' }).first(),
  historyDateToInput:    page.getByRole('dialog').getByRole('textbox', { name: 'Select a date.' }).nth(1),
  historySearchButton:   page.getByRole('dialog').getByRole('button', { name: 'Search' }),
  historyResetButton:    page.getByRole('dialog').getByRole('button', { name: 'Reset' }),
  // History grid uses actual <table> element, not role="grid"
  historyGrid:           page.getByRole('dialog').locator('table').first(),
  // Close button is an <i class="fa fa-times"> icon, click its parent div
  historyCloseButton:    page.getByRole('dialog').locator('.popup-structure-header i.fa-times').first(),

  // ─── DOC Detail — Certification Decision tab ─────────────────────────────
  // Panel is uniquely identified by buttons or section headings present only on this tab
  certDecisionPanel: page.getByRole('tabpanel').filter({
    has: page.getByRole('button', { name: 'Propose Decision' })
      .or(page.getByText('DOC Approvals'))
      .or(page.getByText('Proposed Decision')),
  }).first(),
  proposeDecisionButton:        page.getByRole('button', { name: 'Propose Decision' }),
  submitForApprovalButton:      page.getByRole('button', { name: 'Submit for Approval' }),
  sendForReworkButton:          page.getByRole('button', { name: 'Send for Rework' }),
  // Warning text displayed when no proposed decision is set yet
  certDecisionWarningText:      page.getByText(/Proposed certification decision is not specified/i).first(),
  // DOC Approvals / Signatures (Certification Approval status)
  docApprovalsSection:          page.getByText('DOC Approvals').first(),
  docSignaturesSection:         page.getByText('DOC Signatures').first(),
  // Unresolved Findings section (Issue Certification stage)
  unresolvedFindingsSection:    page.getByText('Unresolved Findings').first(),
  unresolvedFindingsGrid:       page.locator('table').filter({
    has: page.locator('th').filter({ hasText: 'Finding ID' }),
  }).first(),
  // Risk Summary cards on the Certification Decision tab
  // ITS card uses case-insensitive regex to match "ITS Control Summary" or "ITS CONTROL SUMMARY"
  certDecisionItsCardTitle:     page.getByRole('tabpanel').getByText(/ITS Control Summary/i).first(),
});

export type DocDetailsLocators = ReturnType<typeof docDetailsLocators>;
