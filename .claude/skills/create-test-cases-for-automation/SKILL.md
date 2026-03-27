---
name: create-test-cases-for-automation
description: Use when the user provides a Jira user story ID and wants test cases generated for Playwright TypeScript automation, or when creating structured test cases that will be handed to the automation-tester agent for script generation
agents: atlas, manual-tester
---

# Create Test Cases for Automation

You are a **Lead QA Engineer for Schneider Electric** creating test cases that serve as direct
input for the `automation-tester` agent. Every test case must be machine-parseable: explicit
assertions, Action+[Element]+Value step format, OutSystems widget notes, and AC traceability.

---

## Step 1 — Collect inputs

Get from the user:

- **Story ID(s)** — e.g., `PROJ-452` (required, repeatable)

---

## Step 2 — Fetch story data via Atlas agent (Haiku)

Spawn the `atlas` subagent for each story ID. Use this prompt template:

```text
TEST_CASE_FETCH_MODE

story_id: <STORY-ID>

Fetch the Jira issue and return ONLY this JSON object:
{
  "key": "<issue key>",
  "summary": "<summary>",
  "description": "<plain text — recursively extract all text node values from ADF content tree, join with newlines>",
  "acceptance_criteria": "<plain text from customfield_10014 — same ADF extraction>",
  "status": "<fields.status.name>",
  "priority": "<fields.priority.name>",
  "assignee": "<fields.assignee.displayName or empty string if null>",
  "story_screenshots": [["filename.png", "data:image/png;base64,<FULL untruncated base64 string>"]]
}

Use: jira_get_issue(issue_key="<story_id>", fields=["summary","status","priority","assignee","description","customfield_10014","attachment"])
For image attachments (.png/.jpg/.jpeg): call jira_download_attachments and include verbatim base64 in story_screenshots.
```

Write the returned JSON as-is to `output/test_cases/story_data_<STORY-ID>_<date>.json`.

Process one story at a time — separate Atlas spawns and JSON files.

---

## Step 3 — Generate automation-ready test cases (YOU do this)

For each story, read its data JSON. Generate a comprehensive set of test cases following ALL rules below.

### CRITICAL RULES

- Base test cases ONLY on the story's acceptance criteria and description. Do NOT invent requirements.
- Every test case must trace back to a specific AC item (`ac_reference` field).
- Minimum test cases per story: number of AC items + 1.
- Cover: all happy paths, all negative cases, all edge cases, permission/role boundaries, error/validation states.

### TEST TYPES — generate all three

- `"Positive"` — valid input, expected happy path
- `"Negative"` — invalid input, forbidden actions, error states
- `"Edge Case"` — boundary values, empty states, unusual but valid scenarios

### STEP FORMAT — Action + [Element label] + Value

Every test step must follow this pattern so the automation tester can map it directly to a Playwright action:

```text
"Navigate to Product Detail page for product PIC-TEST-001"
"Click [Edit Product button]"
"Fill [Product Name field] with 'Widget Pro'"
"Select [Status dropdown] option 'Active'"
"Click [Save Changes button]"
"Verify [Error alert] contains 'This field is required'"
```

**Rules:**
- Element names in `[brackets]` use the visible label or ARIA role name — NEVER CSS classes, IDs, or positional descriptions like "the second button".
- Always specify exact test data values — never "enter valid data" or "enter a name".
- Navigation steps must name the destination page explicitly.
- For OutSystems searchable/user-lookup inputs: `"Type 'Widget' in [Product search field] using pressSequentially"`.

### ASSERTIONS ARRAY — one entry per verifiable outcome

Do not bundle multiple assertions into `expected_result`. List each separately:

- `condition` must be a Playwright web-first assertion name: `toBeVisible`, `toHaveText`, `toContainText`, `toHaveValue`, `toBeEnabled`, `toBeDisabled`, `toBeChecked`, `not.toBeVisible`

### PRECONDITIONS — automatable state only

- BAD: `"User is logged in"`
- GOOD: `"User is authenticated as Product Owner via storageState fixture"`
- BAD: `"Some products exist"`
- GOOD: `"Product PIC-TEST-001 exists in 'Draft' status"`

### TEST TAGS

- `@smoke` — mark only 1–2 critical happy path tests per story (must pass on every deploy)
- `@regression` — all other tests

### AUTOMATION NOTES — required when steps involve

| Interaction | Required note |
|---|---|
| OutSystems dropdown | "Click dropdown trigger, then click option text. Never use selectOption()." |
| Searchable / user-lookup input | "Use pressSequentially() with delay, not fill()." |
| Any screen navigation or form save | "Call waitForOSScreenLoad() before next assertion." |
| Popup or modal | "Wait for .osui-popup to be visible before interacting." |
| Tab switch | "Wait for tabpanel grid columnheader after clicking tab." |
| Plain text input | "Standard fill() is safe here." |

If none of the above apply, `automation_notes` may be omitted or set to `null`.

### JSON schema — each test case

```json
{
  "id": "TC-001",
  "title": "Product Owner can save a product with a new name",
  "ac_reference": "AC1",
  "page": "Product Detail",
  "preconditions": "User is authenticated as Product Owner. Product PIC-TEST-001 exists in Draft status.",
  "test_steps": [
    "Navigate to Product Detail page for product PIC-TEST-001",
    "Click [Edit Product button]",
    "Fill [Product Name field] with 'Widget Pro'",
    "Click [Save Changes button]"
  ],
  "assertions": [
    { "element": "success feedback message", "condition": "toBeVisible", "expected": "Product saved successfully" },
    { "element": "Product Name field", "condition": "toHaveValue", "expected": "Widget Pro" }
  ],
  "expected_result": "Product saved; success message visible; name field reflects new value",
  "priority": "High | Medium | Low",
  "test_type": "Positive | Negative | Edge Case",
  "test_tags": ["@smoke"],
  "automation_notes": "After clicking Save, call waitForOSScreenLoad() before asserting. Product Name is a plain text input — use fill()."
}
```

Write the generated JSON array to `output/test_cases/test_cases_auto_<STORY-ID>_<date>.json`.
Process one story at a time — separate JSON files.

---

## Step 4 — Render HTML

For each story:

```bash
cd projects/docs-generator
python3 main.py test-cases \
  --story-data output/test_cases/story_data_<STORY-ID>_<date>.json \
  --test-cases-json output/test_cases/test_cases_auto_<STORY-ID>_<date>.json
```

---

## Step 5 — Report

- Confirm the HTML output path per story
- State: N test cases generated (breakdown: X positive, Y negative, Z edge cases)
- List `@smoke` tests by title
- Flag any AC items that were ambiguous or lacked testable detail — automation tester needs precise specs
