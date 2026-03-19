# Release Notes Template — PICASso Format

This template mirrors the official PICASso release notes document format (e.g. ER-2025-RC-11.0).
Follow every section and sub-section in order.
Replace all {PLACEHOLDER} tokens with real content extracted from the spec.
Never invent information not present in the source.

---

## SECTION 1 — Title

Output as `<h1>`:

  Release Notes: {RELEASE_TYPE} {VERSION}

- **{RELEASE_TYPE}**: derive from the version string:
  - Starts with "ER-" → "Enhancement Release"
  - Starts with "RC-" or "PIC-" → "Release Candidate"
  - If unclear, use "Release"
- **{VERSION}**: the full version string as provided (e.g. `ER-2025-RC-11.0` or `PIC-2026-RC-9.0`)

---

## SECTION 2 — Revision History

`<h2>` heading: **Revision History**

Generate as an HTML `<table>` with exactly these four columns:

| Version | Date   | Modified By | Description of Change  |
|---------|--------|-------------|------------------------|
| 1.0     | {DATE} | {AUTHOR}    | Release Notes          |

- If the spec mentions authors or revision dates, use them.
- If not, use: version `1.0`, today's date, `{APP_NAME} Release Management`, `Release Notes`.

---

## SECTION 3 — Introduction

`<h2>` heading: **1. Introduction**

Render the following metadata fields as labeled paragraphs (NOT a table).
Use `<p><strong>Label:</strong> Value</p>` for each field:

- **Project Name:** {APP_NAME}
- **Program Manager Schneider Electric:** {PROGRAM_MANAGER from spec, or "N/A"}
- **Project Manager:** {PROJECT_MANAGER from spec, or "N/A"}
- **Enhancement / Release Technical Lead:** {TECHNICAL_LEAD from spec, or "N/A"}
- **Release Name:** {APP_NAME} {VERSION}
- **Date of Move to Prod (MTP):** {MTP_DATE from spec, or the -ReleaseDate parameter value}

Do NOT add narrative text here that is not in the spec. This section presents cover metadata only.

---

## SECTION 4 — Objectives

`<h2>` heading: **2. Objectives**

One paragraph (or a short bullet list if the spec lists multiple objectives) stating the primary goals of this release:
- What defects, enhancements, or new capabilities are being delivered
- Which business areas or user workflows are affected
- Reference the spec's stated objectives as closely as possible

Example phrasing:
  "The main objective of this release is to fix defects and implement enhancements: {list the main themes from the spec}."

---

## SECTION 5 — New Features and Enhancements

`<h2>` heading: **3. New Features and Enhancements**

For EACH feature or enhancement described in the spec, generate a numbered subsection.
Number them sequentially: 3.1, 3.2, 3.3, ...

### Sub-section structure for each feature:

`<h3>` heading: **3.{N}. {Feature Name}**

**Overview paragraph** (1–2 sentences):
What this feature introduces and who benefits from it. Taken directly from the spec.

**Key Features** (rendered as `<p><strong>Key Features</strong></p>` label, then `<ol><li>` list):

Number each distinct capability or sub-feature mentioned in the spec:

1. **{Sub-feature name}** — {Description: what the user can do, which UI element or API is involved, the behavior in detail.}
   Sub-bullets (`<ul><li>`) for:
   - Field names / API parameters / configuration values (list each one individually)
   - Conditions, constraints, or worked examples from the spec

Rules for this section:
- Every distinct capability mentioned in the spec MUST appear as a numbered `<li>`.
- For **UI changes**: describe the button, screen, pop-up, or workflow change exactly as stated.
- For **API changes**: list new/modified/removed endpoints and all fields added/removed, with their purpose.
- For **business logic changes**: describe the rule or condition that changed.
- If the spec uses numbered sub-items (1., 2., 3. ...), preserve that numbering.
- Do not merge distinct sub-features into one item.
- Keep descriptions factual — only include what the spec says.
- **Do NOT include JIRA issue keys** (e.g. PIC-1234, PROJ-567) anywhere in the output. Release notes are customer/stakeholder-facing — JIRA IDs are internal tracking artifacts and must be omitted.

---

## SECTION 6 — Defect Fixes

Add as the LAST numbered subsection within Section 3.

`<h3>` heading: **3.{N}. Defect Fixes**

Opening sentence: "The following defects were fixed with this release:"

Then a `<ul>` list. Each `<li>` is one defect fix.

**Simple defect fix** (one sentence):
  `<li>Brief description of what was fixed.</li>`

**Complex defect fix** (where the spec provides structured detail):
  `<li><strong>{Fix Title}</strong><br>
  <strong>What's New:</strong> {description of the behavioral change}<br>
  <strong>No Additional Approval Needed:</strong> {explanation, if applicable}<br>
  <strong>Example:</strong> {concrete example from the spec, if provided}</li>`

Rules:
- Only include fixes explicitly listed in the spec.
- If no defect fixes are mentioned, omit this subsection entirely.
- **Do NOT include JIRA issue keys** in defect fix descriptions. Describe the fix by its functional impact only.
- If the spec groups fixes by topic (e.g. "Rework logic improvement"), use that as the fix title.

---

## FORMATTING RULES

- Use `<h1>` for the document title only
- Use `<h2>` for major section headings (Revision History, 1. Introduction, 2. Objectives, 3. New Features and Enhancements)
- Use `<h3>` for feature subsection headings (3.1, 3.2, ... and Defect Fixes)
- Use `<p><strong>Label:</strong> Value</p>` for metadata field lines in the Introduction
- Use `<strong>Key Features</strong>` as a label before numbered capability lists
- Use `<ol>/<li>` for numbered capability lists under "Key Features"
- Use `<ul>/<li>` for bullet sub-details within features and for defect fix lists
- Use `<table>` for the Revision History section
- Do NOT wrap output in `<html>`, `<head>`, or `<body>` tags
- Do NOT use markdown syntax in the output — only HTML
- Do NOT include JIRA issue keys (e.g. PIC-1234) anywhere in the output — release notes are stakeholder-facing
- Start output directly with the `<h1>` title, then sections in order
