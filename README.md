# test-plan-generator

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) with a plugin that turns requirements into comprehensive, structured test plans — so you spend minutes instead of hours writing test cases.

Give it a Jira ticket, a Linear issue, or pasted requirements, and it produces a full test plan with 50-150+ test cases organized into hierarchical suites, each traced back to the original requirement.

## Quick start

```bash
# 1. Add the marketplace
/plugin marketplace add NazarKalytiuk/test-plan-generator

# 2. Install the plugin
/plugin install test-plan-generator@nazar-qa-tools

# 3. Reload
/reload-plugins
```

Then just ask:

```
Create a test plan for PROJ-456
```

## Installation

### Option 1: From the marketplace (recommended)

Add this repo as a marketplace and install the plugin:

```bash
/plugin marketplace add NazarKalytiuk/test-plan-generator
/plugin install test-plan-generator@nazar-qa-tools
/reload-plugins
```

To install for your whole team (shared via `.claude/settings.json`):

```bash
/plugin install test-plan-generator@nazar-qa-tools --scope project
```

### Option 2: Local testing with `--plugin-dir`

```bash
git clone https://github.com/NazarKalytiuk/test-plan-generator.git
claude --plugin-dir ./test-plan-generator/plugins/test-plan-generator
```

### Option 3: Team auto-setup

Add to your project's `.claude/settings.json` so the marketplace is available for all team members:

```json
{
  "extraKnownMarketplaces": {
    "nazar-qa-tools": {
      "source": {
        "source": "github",
        "repo": "NazarKalytiuk/test-plan-generator"
      }
    }
  },
  "enabledPlugins": {
    "test-plan-generator@nazar-qa-tools": true
  }
}
```

### Option 4: Claude.ai (skill upload)

1. Download and zip the `plugins/test-plan-generator/skills/test-plan-generator` folder
2. Go to **Settings > Capabilities > Skills**
3. Click **Upload skill** and select the zip
4. Toggle the skill on

## How it works

The plugin applies formal test design techniques from ISTQB and industry best practices, automatically selecting the right technique based on the requirement pattern:

| Requirement pattern | Technique applied |
|---|---|
| Input field with valid range (e.g., age 18-65) | Equivalence Partitioning + Boundary Value Analysis |
| Multiple conditions with different outcomes | Decision Table Testing |
| Workflow with distinct states (e.g., order lifecycle) | State Transition Testing |
| User journey or transaction flow | Use Case Testing |
| Multiple independent parameters (e.g., OS x Browser x Role) | Pairwise Testing |
| Permission/role-based behavior | Decision Table (roles x actions x outcomes) |

Multiple techniques are applied per area — a registration form gets EP + BVA for each field, decision tables for validation rules, use case testing for the flow, and state transition for account states.

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

If you have the Atlassian or Linear MCP plugin connected, the skill reads the ticket and **all subtasks** automatically:

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

A structured markdown test plan:

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

### Example output scale

For a "User Registration" feature, the plugin produced **47 test cases** across 5 suites:

| Suite | Test cases | Techniques |
|---|---|---|
| Email Field Validation | 12 | EP, BVA |
| Password Validation | 10 | EP, BVA, Decision Table |
| Registration Flow | 8 | Use Case Testing |
| Account State Transitions | 7 | State Transition |
| Error Handling & Edge Cases | 10 | Error Guessing |

With a complete traceability matrix mapping every acceptance criterion to its covering test cases.

## Works best with

The plugin works standalone, but becomes more powerful when paired with MCP integrations:

| MCP plugin | What it enables |
|---|---|
| **Atlassian** (Jira/Confluence) | Read tickets, subtasks, linked Confluence pages automatically |
| **Linear** | Read issues, sub-issues, linked documents automatically |

Without MCP, just paste requirements directly into the conversation.

## What it does NOT do

- Write code-level unit tests or test automation scripts
- Generate test code for Jest, Pytest, Cypress, etc.
- Test individual functions or methods
- Replace exploratory testing

This plugin works from **requirements**, not from source code.

## Repository structure

```
test-plan-generator/
├── .claude-plugin/
│   └── marketplace.json                     # Marketplace catalog
├── plugins/
│   └── test-plan-generator/                 # The plugin
│       ├── .claude-plugin/
│       │   └── plugin.json                  # Plugin manifest
│       └── skills/
│           └── test-plan-generator/
│               ├── SKILL.md                 # Main skill instructions
│               └── references/
│                   ├── test-techniques.md
│                   ├── test-case-template.md
│                   └── quality-characteristics.md
└── README.md
```

## License

MIT
