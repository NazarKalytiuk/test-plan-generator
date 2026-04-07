# test-plan-generator

A Claude Code plugin that generates comprehensive, structured test plans from requirements and specifications — not from code.

## What it does

The test-plan-generator plugin enables QA engineers and developers to produce detailed test plans with 50-150+ test cases from a Jira ticket, Linear issue, or pasted requirements — in seconds instead of hours of manual work.

It systematically applies formal test design techniques:
- **Equivalence Partitioning** and **Boundary Value Analysis** for input validation
- **Decision Table Testing** for complex business rules
- **State Transition Testing** for workflows and lifecycles
- **Use Case Testing** for end-to-end user journeys
- **Pairwise Testing** for parameter combinations

Each test case includes priority, preconditions, steps, expected results, and traceability back to the original requirement.

## Installation

### Option 1: Test locally with `--plugin-dir`

```bash
git clone https://github.com/NazarKalytiuk/test-plan-generator.git
claude --plugin-dir ./test-plan-generator
```

### Option 2: Install from a marketplace

If this plugin is added to a marketplace you have configured:

```bash
/plugin install test-plan-generator@marketplace-name
```

### Option 3: Claude.ai

1. Download the skill folder (or ZIP from Releases)
2. Open Claude.ai > Settings > Capabilities > Skills
3. Click "Upload skill"
4. Select the `skills/test-plan-generator` folder (zipped)
5. Toggle on the skill

## Usage

The skill triggers automatically when you say things like:

- "Generate a test plan for PROJ-123"
- "Write test cases for this feature"
- "QA this ticket"
- "Create test scenarios from these requirements"

Or invoke it directly:

```
/test-plan-generator:test-plan-generator
```

### With Jira/Linear integration

If you have Jira or Linear MCP servers connected, the skill reads tickets (including all subtasks and linked documents) automatically:

```
Create a test plan for PROJ-456
```

### With pasted requirements

Just paste your requirements and ask:

```
Write a test plan for this feature:

[paste requirements here]
```

### Output

The skill produces a structured markdown test plan containing:

- Overview and scope
- Test environment and preconditions
- Hierarchical test suites organized by functional area
- Individual test cases with full detail (priority, technique, steps, expected results)
- Traceability matrix mapping requirements to test cases
- Risks and assumptions

## Plugin structure

```
test-plan-generator/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── test-plan-generator/
│       ├── SKILL.md
│       └── references/
│           ├── test-techniques.md
│           ├── test-case-template.md
│           └── quality-characteristics.md
└── README.md
```

## When NOT to use

- Writing code-level unit tests or test automation code
- Testing individual functions or methods
- Generating test scripts for frameworks like Jest, Pytest, etc.

## License

MIT
