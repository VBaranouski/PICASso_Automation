# Test Specifications

This directory contains human-readable test specifications that Claude CLI agent converts into Playwright tests.

## How to Write a Spec

1. Copy `_template.md` to `{feature}/{scenario}.md`
2. Fill in all sections: Meta, Steps, Expected Results, Test Data
3. Run Claude CLI to generate the test from your spec

## Directory Structure

Organize specs by feature area:

```
specs/
├── auth/
│   ├── login.md
│   └── logout.md
├── navigation/
│   └── main-menu.md
└── _template.md
```

## Spec Format

See `_template.md` for the full format. Key sections:

- **Meta**: Priority, tags, preconditions, target URL, page object
- **Steps**: Numbered list of user actions
- **Expected Results**: What should be true after the steps
- **Test Data**: Table of input values
