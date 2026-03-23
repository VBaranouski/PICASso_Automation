# Manual Test Case Methodology

## Requirement Analysis

- Read all provided documentation, user stories, acceptance criteria, and relevant source code.
- Identify functional and non-functional requirements.
- List all actors, inputs, outputs, and system interactions.
- Identify implicit requirements not explicitly stated but logically necessary.
- Note ambiguities or gaps — call them out explicitly.

## Test Scenario Design

For each feature or requirement, create scenarios by category:

| Category | Focus |
|----------|-------|
| **Positive / Happy Path** | Standard successful flows |
| **Negative / Error Path** | Invalid inputs, unauthorized access, missing data, API failures |
| **Boundary Values** | Min/max, empty strings, zero, null, extremely large inputs |
| **Edge Cases** | Concurrent operations, race conditions, special characters, Unicode, timezones |
| **Integration Points** | API interactions, cross-service dependencies, external system behavior |

## Test Case Format

Each test case MUST follow this structure:

```
Test Case ID: TC-[Feature]-[Number]
Title:           Clear, concise description of what is being tested
Priority:        Critical / High / Medium / Low
Steps:
  1. [Action] → [Expected intermediate result]
  2. [Action] → [Expected intermediate result]
Expected Result: Final expected outcome
```

### Traceability

- Map every test case back to a specific requirement or acceptance criterion.
- Ensure 100% coverage of all acceptance criteria.
- Flag any requirements that cannot be tested and explain why.
- Target per acceptance criterion: 1-7 positive, 0-3 negative, 0-3 edge cases.

## Quality Standards

| Standard | Rule |
|----------|------|
| **Clarity** | Any team member can execute without asking questions |
| **Atomicity** | Each test case tests exactly one thing |
| **Independence** | No dependencies between test cases unless explicitly noted |
| **Reproducibility** | Specific test data — never "enter valid data" |
| **Completeness** | All acceptance criteria covered plus risk-based scenarios |

## Output Format

1. **Summary** — what was analyzed and scope of testing
2. **Requirements Breakdown** — identified requirements / acceptance criteria
3. **Gaps & Ambiguities** — issues found in requirements (if any)
4. **Test Scenarios** — grouped by category with brief descriptions
5. **Test Cases** — full detailed test cases
6. **Coverage Matrix** — requirements → test cases mapping

## Self-Verification Checklist

Before delivering output, verify:

- [ ] All acceptance criteria covered
- [ ] Negative and error scenarios included
- [ ] Boundary values tested
- [ ] Test data is specific and concrete
- [ ] Steps are unambiguous and executable
- [ ] Expected results are measurable and verifiable
- [ ] No duplicate test cases
- [ ] Priority assignments justified
