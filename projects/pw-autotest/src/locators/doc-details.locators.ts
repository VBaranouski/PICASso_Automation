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
  docStatusBadge:  page.getByText('Controls Scoping'),
  docStageLabel:   page.getByText('Scope ITS Controls').first(),

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

  // --- Digital Offer Details tab panel content ---
  digitalOfferDetailsPanel: page.getByRole('tabpanel').filter({ has: page.getByText('DOC Reason') }).first(),

  // --- DOC flow stage tabs (Initiate DOC tab shows initiator + date after completion) ---
  // The "Initiate DOC" flow tab contains the initiator username and date underneath
  initiateStageContainer: page.getByRole('tab', { name: 'Initiate DOC' }),

  // --- Cancel DOC button (visible in header for users with cancel privilege) ---
  cancelDocButton: page.getByRole('button', { name: 'Cancel DOC' }),

  // --- First DOC link in the certification table (on Product Detail page) ---
  // After initiating DOC, used to navigate to the new DOC Details page
  firstDocTableLink: page.getByRole('grid').getByRole('link').first(),

  // --- Digital Offer Certifications table (on Product Detail page) ---
  certificationTableRow: (docId: string) =>
    page.getByRole('row').filter({ hasText: docId }),
  startDateCellByDocId: (docId: string) =>
    page.getByRole('row').filter({ hasText: docId })
      .getByRole('cell').filter({ hasText: /\d{2}\/\d{2}\/\d{4}|^\s*$/ }).first(),
});

export type DocDetailsLocators = ReturnType<typeof docDetailsLocators>;
