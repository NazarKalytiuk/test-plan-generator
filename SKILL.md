---
name: test-plan-generator
description: Generate comprehensive, structured test plans and test cases from requirements and specifications. Reads feature tickets (Jira, Linear, or pasted text) with subtasks and produces a detailed markdown test plan with hierarchical test suites and individual test cases. Uses professional test design techniques (equivalence partitioning, boundary value analysis, decision tables, state transition, use case testing). Use when user says "test plan", "test cases", "write tests for this feature", "QA this ticket", mentions testing a Jira/Linear ticket, or asks to create test scenarios from requirements. Do NOT use for code-level unit tests or test automation code.
---

# Test Plan Generator

Generate detailed, structured test plans and test cases from requirements and specifications — not from code.

## Important Principles

- ALWAYS work from requirements, specifications, user stories, and acceptance criteria — never from source code
- ALWAYS apply formal test design techniques systematically (see `references/test-techniques.md`)
- ALWAYS produce many test cases — large features need 50-150+ test cases organized hierarchically
- ALWAYS trace each test case back to a specific requirement or acceptance criterion
- NEVER skip negative testing, boundary values, or error scenarios
- NEVER produce shallow test plans with only happy-path scenarios
- Quality is more important than speed — take your time to be thorough

## Workflow

### Step 1: Gather Requirements

Read the ticket and all related context. Use whatever MCP tools are available:

**For Jira tickets:**
- Use `getJiraIssue` to read the main ticket
- Use `searchJiraIssuesUsingJql` with `parent = TICKET-KEY` to find subtasks
- Check for linked Confluence pages via links in the ticket or `searchConfluenceUsingCql`
- Read acceptance criteria, attachments descriptions, comments

**For Linear tickets:**
- Use `get_issue` to read the main ticket
- Use `list_issues` with project filter to find sub-issues
- Check linked documents via `list_documents` or `get_document`

**For pasted text:**
- Parse the requirements directly from the user's message

**CRITICAL:** If the ticket has subtasks or sub-issues, read ALL of them. Each subtask often contains detailed acceptance criteria that are essential for thorough test coverage.

After gathering, create a mental model of:
- What is the feature? (scope, boundaries)
- Who are the actors/users?
- What are the inputs and outputs?
- What are the business rules?
- What are the states and transitions?
- What are the integrations/dependencies?
- What are the non-functional requirements (performance, security, accessibility)?

### Step 2: Analyze and Decompose

Break the feature into **functional areas** (test suites). For each area, identify:

1. **Test conditions** — what aspects need testing (ISTQB: "what to test")
2. **Applicable test techniques** — which formal techniques to apply (see Step 3)
3. **Risk level** — High/Medium/Low based on business impact and technical complexity

Consult `references/test-techniques.md` for detailed guidance on each technique.

### Step 3: Select and Apply Test Design Techniques

For each functional area, determine which techniques apply. The skill MUST automatically select techniques based on requirement patterns:

| Requirement Pattern | Technique to Apply |
|---|---|
| Input field with valid range (e.g., age 18-65) | Equivalence Partitioning + Boundary Value Analysis |
| Multiple conditions with different outcomes | Decision Table Testing |
| Workflow with distinct states (e.g., order lifecycle) | State Transition Testing |
| User journey / transaction flow | Use Case Testing |
| Multiple independent parameters (e.g., OS x Browser x Role) | Pairwise Testing |
| Discrete set of valid values (e.g., dropdown options) | Equivalence Partitioning |
| Complex business rules with exceptions | Decision Table Testing |
| API endpoints with request/response | Use Case Testing + EP + BVA for each parameter |
| Permission/role-based behavior | Decision Table (roles x actions x expected outcomes) |

**Apply MULTIPLE techniques per area.** For example, a registration form needs: EP + BVA for each field, decision tables for validation rules, use case testing for the overall flow, and state transition for the account states.

### Step 4: Generate Test Cases

For each functional area, generate test cases following this structure per test case:

```
**TC-{suite}-{number}: {Descriptive title}**
- **Priority:** {Critical / High / Medium / Low}
- **Technique:** {Which test design technique was used}
- **Preconditions:** {Required state before test execution}
- **Steps:**
  1. {Action step}
  2. {Action step}
  ...
- **Expected Result:** {Clear, verifiable expected outcome}
- **Requirement:** {Traceability to original requirement/AC}
```

**Test case generation rules:**
- Start with positive/happy path scenarios
- Then boundary values (on, above, below each boundary)
- Then negative scenarios (invalid inputs, unauthorized access, missing data)
- Then edge cases (empty states, max limits, concurrent operations)
- Then integration/interaction scenarios
- Then non-functional scenarios (performance, security, accessibility) if requirements mention them
- For each equivalence class — at least 1 test case
- For each boundary — test ON the boundary, BELOW, and ABOVE
- For each decision table rule — at least 1 test case
- For each state transition — at least 1 test case per valid transition + invalid transitions
- For each use case — at least 1 test for main success + 1 per extension/alternative flow

### Step 5: Compile the Test Plan Document

Produce a single markdown document with this structure:

```markdown
# Test Plan: {Feature Name}

## 1. Overview
- **Feature:** {name and brief description}
- **Source:** {ticket ID and link}
- **Date:** {generation date}
- **Test Approach:** {which techniques were applied and why}
- **Total Test Cases:** {count}

## 2. Scope
### In Scope
{What will be tested}
### Out of Scope
{What will NOT be tested and why}

## 3. Test Environment & Preconditions
{Required setup, test data, accounts, configurations}

## 4. Test Suites

### 4.1 {Functional Area Name} ({count} test cases)
**Applicable techniques:** {list}
**Risk level:** {High/Medium/Low}

{All test cases for this area}

### 4.2 {Next Functional Area} ({count} test cases)
...

## 5. Traceability Matrix
| Requirement/AC | Test Cases | Coverage |
|---|---|---|
| {req} | TC-XX-01, TC-XX-02 | Full / Partial |

## 6. Risks and Assumptions
{Known risks, assumptions made during test planning}
```

### Step 6: Self-Review Checklist

Before delivering, verify:
- [ ] Every acceptance criterion has at least one test case
- [ ] Every input field has EP + BVA test cases
- [ ] Every business rule has decision table test cases
- [ ] Every workflow has state transition + use case test cases
- [ ] Negative scenarios are present for each positive scenario
- [ ] Boundary values are tested (on, below, above)
- [ ] Error handling and edge cases are covered
- [ ] Traceability matrix is complete
- [ ] Test case count is proportional to feature complexity (small feature: 15-30, medium: 30-70, large: 70-150+)

## Output Format

- Output format is **markdown (.md)**
- Save the file to the user's workspace folder
- Use clear, consistent formatting
- Write test cases in the language of the original requirements (if requirements are in Ukrainian, write tests in Ukrainian; if in English, write in English)

## Error Handling

- If the ticket cannot be read (permissions, wrong link), explain the issue and ask the user to paste the requirements text
- If requirements are vague or incomplete, note the gaps explicitly in "Risks and Assumptions" and generate test cases based on reasonable assumptions (clearly marked)
- If a subtask has no description, skip it but note it as a coverage gap

## References

For detailed guidance on each test design technique with examples, consult `references/test-techniques.md`.
For output format examples and test case templates, consult `references/test-case-template.md`.
For quality characteristics to consider in non-functional testing, consult `references/quality-characteristics.md`.
