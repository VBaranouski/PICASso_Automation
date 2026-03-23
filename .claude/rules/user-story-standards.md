# User Story & Task Writing Standards

Standards for writing JIRA-ready User Stories and Tasks for the PICASso project.
Derived from real examples: PIC-8803, PIC-8804, PIC-9831, PIC-9901, PIC-9481, PIC-8998, PIC-7948, PIC-9766.

---

## Ticket types: Story vs Task

| Type      | When to use                                                   | Has As a/I want/So that? | Has AC? |
|-----------|---------------------------------------------------------------|--------------------------|---------|
| **Story** | User-facing capability, UI change, API endpoint, behavior     | Yes                      | Yes     |
| **Task**  | Dev-only: DB changes, data migration, technical config, no UI | No                       | No      |

**Task example (PIC-9766):** Plain description + field tables only. No user story statement. No testing required.

---

## Story statement formats

### Frontoffice / UI stories (PIC-8803, PIC-9831)

```text
*As a* [specific role with permission context],
*I want* [clear capability],
*So that* [concrete business benefit].
```

### API / Integration stories (PIC-9481, PIC-8998)

```text
*As a* [role or system],
*I want to* [action],
*So that* [benefit].
```

### Backoffice stories (PIC-7948)

```text
*As a user*
*I want* [action]
*so that* [benefit]
```

No comma after role. `so that` lowercase. Brief statement — details go in AC.

---

## Roles — be specific, never generic

- BAD: "As a user, ..."
- GOOD: "As a Product Owner/Security Advisor, ..."
- GOOD: "As a user with permissions to edit requirement status, ..."
- GOOD: "As a user with privilege to create and edit the Product in PICASso"
- GOOD: "As a user of Jama integration in PICASso"

Extract the role from the spec — who does this action, and what permission/privilege do they need?

---

## AC formats

### Pattern 1 — numbered `#` list (frontoffice, behavioral)

Used in PIC-8803, PIC-9831. One condition per item:

```text
*Acceptance Criteria*
 # When [condition], [expected result].
 # The [field/button] displays [specific text/behavior].
 # Upon clicking [action], [result with exact pop-up text in quotes].
```

### Pattern 2 — labeled `AC1:`, `AC2:` with sub-bullets (complex UI, multiple conditions)

Used in PIC-9901, PIC-7948. Each AC covers a distinct condition or screen state:

```text
*Acceptance criteria:*

AC1: When [condition], user sees [result] (see Figma [Label|url])
 * Sub-option A: [detail]
   ** Sub-sub detail

AC2: [Next distinct condition]
```

- Reference specific Figma frames **inline** using `[Label|url]` syntax
- Sub-items use `1.1`, `1.2` numbering or ` * ` bullets

### Pattern 3 — bold `*AC1.*` (API / integration stories)

Used in PIC-9481, PIC-8998:

```text
*Acceptance criteria:*

*AC1.* [Endpoint and HTTP method]:
||Field||Data type||Description||
|fieldName|string, mandatory|Description|

*AC2.* *Authentication*: POST /token (see [PIC-5619|...])

*AC3.* *Request*:
[table of request fields]

*AC4.* *Responses*:
||Status Code||Error Code||User Message||Developer Message||
|200| | |Success message|
|400|BAD_REQUEST|User message|Dev message|
```

Always include JSON code blocks for examples:

```text
{code:java}
POST /endpoint
{
  "field": "value"
}
{code}
```

---

## AC content rules (all types)

- List every UI field with **exact name**, **type**, and **mandatory** status
- Use JIRA tables `||Header||` for field definitions and API response codes
- Name exact button labels in quotes: `+Add Product`, `Save Changes`
- Describe conditional visibility: "If 'Other Product' is selected, this field appears"
- Include **exact pop-up / confirmation text** in quotes
- Handle edge cases: "If all items removed, empty form remains"
- Cover both manual AND bulk operations in one story if they share intent (PIC-8803 pattern)
- For status changes: include exact tooltip text and status label
- Items in `{color:#4c9aff}...{color}` = recently added/in progress — include as AC
- Items in `{color:#57d9a3}...{color}` = in question — include but flag

---

## Inline Figma references in AC

For stories covering multiple screens, reference the exact Figma frame inside each AC:

```text
AC3: If option "Jama for both" is selected, user sees: (see Figma [Status Mapping - Default|https://www.figma.com/design/...?node-id=1761-14461])
```

---

## Links footer (choose format by type)

**Frontoffice / behavioral** (PIC-8803, PIC-9831):

```text
Link to the specification - [Page Title - PICASso - Confluence Global|https://confluence.se.com/...]
Link to the mockup - [Release – Figma|https://www.figma.com/design/...?node-id=XXXX]
```

**Backoffice** (PIC-7948):

```text
*Useful links:*
FS: [Spec Section Title|https://confluence.se.com/...]
Mockups: [Figma link|https://www.figma.com/design/...?node-id=XXXX]
```

**Complex stories with multiple mockups** (PIC-9901) — use `*Additional information:*` section:

```text
*Additional information:*
 * Functional Specification: [Spec Title|confluence-url]
 * Mockups:
 ** [Frame Name - Default|figma-url-node1]
 ** [Frame Name - Variant|figma-url-node2]
```

Always use the **specific Figma node URL** (not the generic file URL). The Confluence spec header table maps stories to frames.

---

## Story splitting logic

- One story per **distinct user-facing capability or UI screen/pop-up**
- Combine manual + bulk if same intent and same fields (PIC-8803: manual + bulk delegation)
- Split when: different screens, different roles, different data flows, or spec flags "(Maybe would be splitted)"
- New API endpoint = its own story; additional fields on existing endpoint = its own story
- Backoffice and Frontoffice impacts of one feature = separate stories
- Items marked "In question?" in the spec header table → flag story title with `[In Question]`

---

## Reading the PICASso Confluence spec structure

Specs follow this layout:

1. **Header table** — release, feature key, status, Figma link, existing ticket list (check what's already created)
2. **Business Need** — why this feature exists → use for `so_that`
3. **Functional Requirements** — sectioned by area (Manual / Bulk / API / Backoffice / etc.) → each section = 1–2 stories
4. **Questions** — unresolved items; stories depending on these need `[In Question]` flag

When reading, extract:

- Section headers → story titles
- Field tables → AC field tables
- Button/action names → AC steps
- "Note:" items → edge case AC items
- Conditional logic ("If... then...") → one AC item per branch
