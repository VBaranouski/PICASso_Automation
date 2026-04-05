# Naming and File Conventions

Use stable, traceable names for all generated artifacts.

## Source reference

Every intake must be normalized to a `source_ref`.

- Jira: use the issue key exactly, for example `PIC-123`.
- Confluence: use `CONF-<page_id>` when page ID is known.
- Free text: create a slug from the title or opening sentence, for example `product-owner-can-edit-product`.

Also store:

- `source_type`: `jira`, `confluence`, or `free_text`
- `source_title`: short human-readable title
- `generated_on`: ISO date, for example `2026-03-27`

## Artifact names

Use one base name per pipeline stage:

- Requirements JSON: `requirements_<source_ref>_<date>.json`
- Requirements HTML: `requirements_<source_ref>_<date>.html`
- Test cases JSON: `test_cases_auto_<source_ref>_<date>.json`
- Test cases HTML: `test_cases_auto_<source_ref>_<date>.html`
- Automation manifest JSON: `automation_manifest_<source_ref>_<date>.json`
- Automation summary HTML: `automation_summary_<source_ref>_<date>.html`

For free-text stories, use the slugged `source_ref`. Replace spaces with `-`, lowercase the slug, and remove punctuation except `-`.

## Code file conventions

Follow the existing `pw-autotest` style:

- Page objects: `kebab-case.page.ts`
- Locator factories: `kebab-case.locators.ts`
- Tests: `*.spec.ts`
- Export new page objects from `src/pages/index.ts`

When adding a new feature area, prefer:

- `tests/<feature>/...`
- `src/pages/<feature>.page.ts`
- `src/locators/<feature>.locators.ts`

Keep names aligned across artifacts, POMs, and test suites so reviewers can trace one story through the whole pipeline.
