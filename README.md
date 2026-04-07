# test-plan-generator

A [Claude Code plugin](https://code.claude.com/docs/en/plugins) that turns requirements into comprehensive, structured test plans — so you spend minutes instead of hours writing test cases.

Give it a Jira ticket, a Linear issue, or pasted requirements, and it produces a full test plan with 50-150+ test cases organized into hierarchical suites, each traced back to the original requirement.

## Quick start

```bash
# 1. Clone
git clone https://github.com/NazarKalytiuk/test-plan-generator.git

# 2. Run Claude Code with the plugin loaded
claude --plugin-dir ./test-plan-generator
```

Then just ask:

```
Create a test plan for PROJ-456
```

## How it works

The plugin applies formal test design techniques from ISTQB and industry best practices — automatically selecting the right technique based on the requirement pattern:

| Requirement pattern | Technique applied |
|---|---|
| Input field with valid range (e.g., age 18-65) | Equivalence Partitioning + Boundary Value Analysis |
| Multiple conditions with different outcomes | Decision Table Testing |
| Workflow with distinct states (e.g., order lifecycle) | State Transition Testing |
| User journey or transaction flow | Use Case Testing |
| Multiple independent parameters (e.g., OS x Browser x Role) | Pairwise Testing |
| Permission/role-based behavior | Decision Table (roles x actions x outcomes) |

Multiple techniques are applied per area — a registration form gets EP + BVA for each field, decision tables for validation rules, use case testing for the flow, and state transition for account states.

## Installation

### Option 1: Local plugin (recommended for trying it out)

```bash
git clone https://github.com/NazarKalytiuk/test-plan-generator.git
claude --plugin-dir ./test-plan-generator
```

### Option 2: Install from a marketplace

If the plugin has been added to a marketplace you use:

```bash
/plugin install test-plan-generator@marketplace-name
```

### Option 3: Claude.ai (skill upload)

1. Download and zip the `skills/test-plan-generator` folder
2. Go to **Settings > Capabilities > Skills**
3. Click **Upload skill** and select the zip
4. Toggle the skill on

## Usage

### Automatic triggering

The plugin activates automatically when you say things like:

- "Generate a test plan for PROJ-123"
- "Write test cases for this feature"
- "QA this ticket"
- "Create test scenarios from these requirements"

### Manual invocation

```
/test-plan-generator:test-plan-generator
```

### From a Jira or Linear ticket

If you have the [Atlassian](https://code.claude.com/docs/en/discover-plugins) or [Linear](https://code.claude.com/docs/en/discover-plugins) MCP plugin connected, the skill reads the ticket and **all subtasks** automatically:

```
Create a test plan for PROJ-456
```

It pulls acceptance criteria, descriptions, comments, and linked Confluence pages to build a complete picture before generating tests.

### From pasted requirements

```
Write a test plan for this feature:

Users can reset their password via email. They click "Forgot password",
enter their email, receive a link valid for 1 hour, set a new password
(min 8 chars, 1 uppercase, 1 number), and get redirected to login.
```

## What you get

A structured markdown test plan with:

```
# Test Plan: {Feature Name}

## 1. Overview            — feature, source, date, techniques used, total count
## 2. Scope               — what's in/out of scope and why
## 3. Test Environment    — required setup, test data, preconditions
## 4. Test Suites         — organized by functional area
## 5. Traceability Matrix — every requirement mapped to test cases
## 6. Risks & Assumptions — gaps, unknowns, assumptions made
```

Each individual test case includes:

```
TC-EMAIL-01: Valid email format accepted
- Priority:        Critical
- Technique:       EP (valid partition)
- Preconditions:   Registration page is open
- Steps:
  1. Enter "user@example.com" in email field
  2. Fill all other required fields with valid data
  3. Submit the form
- Expected Result: Form submits successfully, no validation error
- Requirement:     AC-1: "User must provide a valid email address"
```

### Example output structure

For a "User Registration" feature, the plugin produced **47 test cases** across 5 suites:

| Suite | Test cases | Techniques |
|---|---|---|
| Email Field Validation | 12 | EP, BVA |
| Password Validation | 10 | EP, BVA, Decision Table |
| Registration Flow | 8 | Use Case Testing |
| Account State Transitions | 7 | State Transition |
| Error Handling & Edge Cases | 10 | Error Guessing |

With a complete traceability matrix mapping every acceptance criterion to its covering test cases.

## What it does NOT do

- Write code-level unit tests or test automation scripts
- Generate test code for Jest, Pytest, Cypress, etc.
- Test individual functions or methods
- Replace exploratory testing

This plugin works from **requirements**, not from source code.

## Plugin structure

```
test-plan-generator/
├── .claude-plugin/
│   └── plugin.json                          # Plugin manifest
├── skills/
│   └── test-plan-generator/
│       ├── SKILL.md                         # Main skill instructions
│       └── references/
│           ├── test-techniques.md           # EP, BVA, Decision Tables, State Transition, etc.
│           ├── test-case-template.md        # Output format and complete example
│           └── quality-characteristics.md   # Non-functional testing (perf, security, a11y)
└── README.md
```

## Works best with

The plugin works standalone, but becomes more powerful when paired with MCP integrations:

| MCP plugin | What it enables |
|---|---|
| **Atlassian** (Jira/Confluence) | Read tickets, subtasks, linked Confluence pages automatically |
| **Linear** | Read issues, sub-issues, linked documents automatically |

Without MCP, just paste requirements directly into the conversation.

## License

MIT
