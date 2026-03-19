# Release Notes Template — Simple Issue Table Format

This file documents the formatting rules and style conventions for the
`release-notes` command output. It also serves as a place to add custom
instructions that will be included in future enhancements.

---

## Document Style

- **Font**: Calibri, Arial, sans-serif — 13px body text
- **Colors**: Schneider Electric dark green (`#009530`) for headings and table headers
- **Layout**: Centered document card (max 860px), white background, light border
- **Page title**: `Release Notes: {VERSION}`

---

## Document Structure

### Summary Strip
A compact metadata band below the title showing:
- Project key
- Release Date (from JIRA version field)
- Status (Released / Unreleased)
- Total issue count
- Per-type issue counts (dynamic — all types found in JIRA)

### Issue Sections
One section per issue type present in the JIRA version.
Each section contains a table with columns: **Key | Type | Summary | Assignee | Status**

Issue type colour coding:
| Type        | Badge colour       |
|-------------|--------------------|
| Bug / Defect| Red tint           |
| Story       | Green tint (SE)    |
| Task        | Blue tint          |
| Improvement | Orange tint        |
| Epic        | Purple tint        |

### Footer
`Generated: {DATE} | {COMPANY} Release Management | {VERSION}`

---

## Customisation Notes

Add any project-specific instructions below this line.
These notes are for reference only — the `release-notes` command renders the
Jinja2 template directly from JIRA data (no AI step).

For AI-generated narrative release notes with Introduction, Objectives, and
detailed feature descriptions, use the `full-release-notes` command instead,
which reads `output/full_release_notes/template/release_notes_template.md`.

---

## Example Reference

See `PIC-2026-RC-9.0-ReleaseNotes.html` in this folder for a reference
example of the full PICASso narrative format (used by `full-release-notes`).
See `PIC-2026-RC-8.1-HotFix-ReleaseNotes-Yammer.html` for the hotfix variant.
