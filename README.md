# nazar-qa-tools — Claude Code plugin marketplace

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) for QA workflows. Two plugins ship today:

| Plugin | What it does | Typical trigger |
|--------|--------------|-----------------|
| [**test-plan-generator**](./plugins/test-plan-generator) | Turns requirements into a structured test plan with 50–150+ test cases organized by formal technique (EP, BVA, decision tables, state transition, use cases) | "Create a test plan for PROJ-456" |
| [**spec-compliance-verifier**](./plugins/spec-compliance-verifier) | Checks whether a NestJS/TypeScript code change correctly implements a Jira user story for a REST endpoint; emits a deterministic JSON verdict (COMPLIANT / VIOLATED / UNDETERMINED) grounded in 5 books | "Does this PR implement PROJ-1001?" |

The two plugins are complementary. `test-plan-generator` produces test cases *from* requirements; `spec-compliance-verifier` verifies code *against* requirements.

## Quick start

```bash
# 1. Add the marketplace
/plugin marketplace add NazarKalytiuk/test-plan-generator

# 2. Install either or both plugins
/plugin install test-plan-generator@nazar-qa-tools
/plugin install spec-compliance-verifier@nazar-qa-tools

# 3. Reload
/reload-plugins
```

Then just ask:

```
Create a test plan for PROJ-456
```

or

```
Verify this controller against PROJ-1001
[paste story + code]
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

## Plugin: spec-compliance-verifier

Given a Jira user story plus a NestJS/TypeScript diff, the skill walks a deterministic 6-stage pipeline and emits a JSON verdict.

### Pipeline

| Stage | Goal | Source books |
|-------|------|--------------|
| **S1 Story Parsing** | Extract actors, operation, data, AC | Adzic — *Specification by Example* |
| **S2 Ambiguity Detection** | Flag under-specified / contradictory AC; abort with blocking questions if critical gaps | Wayne — *Logic for Programmers* |
| **S3 Behavior Model** | Build preconditions, postconditions, invariants, frame conditions | Wayne; Khorikov — *Unit Testing* |
| **S4 Test Enumeration** | Enumerate tests via EP, BVA, decision tables, state transitions | Aniche — *Effective Software Testing* |
| **S5 Property Derivation** | Derive invariants + round-trip + stateful properties beyond examples | Hebert — *Property-Based Testing* |
| **S6 Verdict** | Per check: COMPLIANT / VIOLATED / UNDETERMINED with counterexample | Khorikov; Adzic |

Every technique in the skill is grounded in one of those five books — no fabricated advice.

### Output

Strict JSON conforming to `schemas/verdict.schema.json`:

```json
{
  "summary": { "mode": "static", "total_checks": 12, "compliant": 10, "violated": 0, "undetermined": 2 },
  "checks": [
    { "id": "S3-requires-amount_positive", "stage": "S3",
      "technique_ids": ["preconditions_postconditions"], "source_books": ["B5"],
      "status": "COMPLIANT",
      "evidence": "src/orders/dto/create-order.dto.ts:14 — @IsPositive() on amount",
      "counterexample": null }
  ],
  "undetermined": [],
  "blocking_questions": []
}
```

When the story is ambiguous, S2 aborts and surfaces specific witnesses as `blocking_questions[]`, and every downstream check is `UNDETERMINED`. No multi-turn chat — the skill returns its verdict in a single pass.

### Modes

- **static** (default): Reason over story + code.
- **executable**: Generate Vitest + fast-check + supertest tests; run them via `scripts/run-executable-mode.ts`; map results to checks.
- **auto**: Switch to executable for arithmetic/time/stateful endpoints; stay static otherwise.

### What it does NOT do

- Non-functional (performance, latency, throughput)
- Security (authn/z, injection)
- Architecture conformance
- Code style / linting
- Accessibility / UI

## Repository structure

```
test-plan-generator/                           # repo name (legacy); marketplace is nazar-qa-tools
├── .claude-plugin/
│   └── marketplace.json                       # marketplace catalog (two plugins)
├── plugins/
│   ├── test-plan-generator/
│   │   ├── .claude-plugin/plugin.json
│   │   └── skills/test-plan-generator/
│   │       ├── SKILL.md
│   │       └── references/
│   └── spec-compliance-verifier/
│       ├── .claude-plugin/plugin.json
│       └── skills/spec-compliance-verifier/
│           ├── SKILL.md
│           ├── references/                   # 5 book digests
│           ├── templates/                    # per-stage prompt fragments
│           ├── schemas/                      # input, behavior-model, verdict
│           ├── scripts/                      # fast-check + vitest runner
│           └── examples/                     # 01-happy-path + 02-ambiguous-story
└── README.md
```

## License

MIT
