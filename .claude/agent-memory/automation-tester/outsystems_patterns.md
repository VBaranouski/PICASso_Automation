---
name: OutSystems PICASso UI Patterns
description: DOM patterns and locator strategies discovered while exploring the PICASso OutSystems application
type: project
---

## User Lookup Widget Pattern
The team member assignment (Product Owner, Security Manager, SDPA, PQL) uses a consistent widget:
1. Click the edit link (pencil icon) next to the role label -> reveals a searchbox
2. The searchbox has accessible name "Type 4 letters"
3. Must use `pressSequentially()` (slowly) to trigger the search API - `fill()` does not trigger search
4. Results appear in a dropdown with format: Name, SESA ID, Email
5. Click the parent container of the result text to select

**Why:** OutSystems generates dynamic IDs. Locator strategy must use role labels + relative positioning.
**How to apply:** For any user lookup widget, follow this 3-step pattern (click edit -> type slowly -> click result).

## Cascading Dropdowns
Org Level 1 -> Org Level 2 -> Org Level 3 are cascading `<select>` elements:
- Org Level 2 is `disabled` until Org Level 1 is selected
- Org Level 3 is `disabled` until Org Level 2 is selected
- After parent selection, OutSystems re-renders the child with enabled state + new options
- Use `expect(locator).toBeEnabled()` with timeout to wait for the re-render
- The aria-label changes from "Org Level 3" to "Org Level 3*" (required) after parent is selected

## Product Detail Page States
- **Create mode**: URL = `ProductDetail?ProductId=0`, status = "Draft", form is editable
- **View mode** (after save): URL = `ProductDetail?ProductId={id}`, status = "Active", fields are read-only, "Edit Product" button appears
- Save assigns a real ProductId (PIC-XXXX format)

## Page Load Timing
- OutSystems pages often return empty snapshots immediately after navigation
- Wait 3-5 seconds or use `waitFor` on a known element before taking snapshots
- NEVER use `networkidle` - OutSystems maintains WebSocket connections

## tsconfig.json
- No `dom` lib included - cannot use `document`, `HTMLElement`, `HTMLSelectElement` in page code
- Use Playwright's `expect` assertions (toBeEnabled, toBeVisible) instead of `waitForFunction` with DOM APIs
