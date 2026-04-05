import { type Page } from '@playwright/test';

/**
 * Locators for the Control Detail page (/GRC_PICASso_DOC/ControlDetail).
 *
 * A Control Detail page is reached by clicking a Control ID link in the
 * ITS Checklist tab on the DOC Detail page.
 */
export const controlDetailLocators = (page: Page) => ({

  // ─── Breadcrumb ──────────────────────────────────────────────────────────
  // OutSystems renders breadcrumb links; nav has aria-label="breadcrumb".
  // 3 links: Home [0], Product [1], DOC [2]; current page is a span.title (not a link).
  breadcrumbHomeLink:    page.locator('nav[aria-label="breadcrumb"] a').nth(0),
  breadcrumbProductLink: page.locator('nav[aria-label="breadcrumb"] a').nth(1),
  breadcrumbDocLink:     page.locator('nav[aria-label="breadcrumb"] a').nth(2),
  // The current page segment (e.g. "ITS Control: 11-AUG_ TEST NEW") is a span.title — not a link.
  breadcrumbCurrentText: page.locator('nav[aria-label="breadcrumb"] span.title').last(),

  // ─── Header ──────────────────────────────────────────────────────────────
  // Control name is in .header-title-structure__title (plain div, NOT a heading role).
  // The control name is the raw control ID text (e.g. "11-AUG_ TEST NEW"), not "ITS-NNN" format.
  controlIdHeader:       page.locator('.header-title-structure__title').first(),
  // No status badge visible in Controls Scoping stage.
  assessmentStatusBadge: page.locator('[class*="status-badge"], [class*="badge"]').first(),

  // ─── Content sections ────────────────────────────────────────────────────
  // Description and Evidence Expectation are <label class="OSFillParent"> inside div.info-large.
  // No heading tags exist on this page — section labels are <label> elements.
  descriptionLabel:           page.locator('label.OSFillParent').filter({ hasText: 'Description' }).first(),
  evidenceExpectationLabel:   page.locator('label.OSFillParent').filter({ hasText: 'Evidence Expectation' }).first(),
  // The content value sits in a sibling element after the label's parent.
  descriptionValue:           page.locator('.info-large').filter({ has: page.locator('label').filter({ hasText: 'Description' }) }).locator('p, span, div').last(),
  evidenceExpectationValue:   page.locator('.info-large').filter({ has: page.locator('label').filter({ hasText: 'Evidence Expectation' }) }).locator('p, span, div').last(),

  // Category: <label class="OSFillParent"> inside div.OSInline, value is a sibling span/div.
  categoryLabel:   page.locator('label.OSFillParent').filter({ hasText: 'Category' }).first(),
  categoryValue:   page.locator('.OSInline').filter({ has: page.locator('label').filter({ hasText: 'Category' }) }).locator('span, div').last(),

  // ─── Stage-specific messages ─────────────────────────────────────────────
  // Shown during Controls Scoping stage — before Risk Assessment has started.
  scopingStageReadOnlyMessage: page.getByText(/No evidence links, findings or comments yet/),

  // ─── Findings section ────────────────────────────────────────────────────
  // No heading tags — finding these by text in a label/span.
  noFindingsMessage:   page.getByText('No findings added yet'),

  // ─── Actions ─────────────────────────────────────────────────────────────
  // "Descope Control" is a proper <button> element with that exact text.
  descopeControlButton: page.getByRole('button', { name: 'Descope Control' }),
  // After descoping: button is removed and a tooltip icon may appear next to the Control ID.
  descopeJustificationTooltipIcon: page.locator('[class*="tooltip"][title*="justif"], [aria-label*="justif"]').first(),
});

export type ControlDetailLocators = ReturnType<typeof controlDetailLocators>;
