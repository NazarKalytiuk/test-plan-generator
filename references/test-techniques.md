# Test Design Techniques Reference

This reference provides detailed guidance on each formal test design technique. When generating test cases, consult the relevant section based on the requirement pattern identified in Step 3.

## Table of Contents
1. [Equivalence Partitioning (EP)](#1-equivalence-partitioning)
2. [Boundary Value Analysis (BVA)](#2-boundary-value-analysis)
3. [Decision Table Testing](#3-decision-table-testing)
4. [State Transition Testing](#4-state-transition-testing)
5. [Use Case Testing](#5-use-case-testing)
6. [Pairwise Testing](#6-pairwise-testing)
7. [Experience-Based Techniques](#7-experience-based-techniques)
8. [Technique Selection Flowchart](#8-technique-selection-flowchart)

---

## 1. Equivalence Partitioning

**Source:** Copeland Ch.3, ISTQB v4.0 Section 4.2.1

**Purpose:** Reduce the number of test cases while maintaining coverage by dividing inputs into groups (partitions) where all values in a partition are expected to be treated the same way.

**When to apply:**
- Any input field with a defined range or set of valid values
- API parameters with specified formats/constraints
- Dropdown selections, radio buttons, checkboxes
- Output values that fall into distinct categories

**How to apply:**

1. Identify the input variable
2. Determine the valid partition(s) — ranges or sets of values the system should accept
3. Determine the invalid partition(s) — values the system should reject
4. Select ONE representative value from each partition

**Partition types by input kind:**

| Input Kind | Valid Partitions | Invalid Partitions |
|---|---|---|
| Continuous range (e.g., age 18-65) | One: {18..65} | Two: {<18}, {>65} |
| Discrete range (e.g., quantity 1-10) | One: {1..10} | Two: {<1}, {>10} |
| Set of values (e.g., country dropdown) | One per set member, or one for the whole set | Any value not in set |
| Boolean (e.g., checkbox) | {true}, {false} | N/A (if GUI constrained) |
| Text with format (e.g., email) | {valid format} | {invalid format}, {empty}, {too long} |

**Rules:**
- Each partition needs at least ONE test case
- Invalid partitions are a great source of defects — never skip them
- If a GUI control constrains input (e.g., dropdown), invalid partitions may not exist for that control — but test the API layer separately

**Example:**
Requirement: "Monthly income must be between $1,000 and $83,333"
- Valid partition: {$1,000..$83,333} → test with $50,000
- Invalid below: {<$1,000} → test with $500
- Invalid above: {>$83,333} → test with $100,000

---

## 2. Boundary Value Analysis

**Source:** Copeland Ch.4, ISTQB v4.0 Section 4.2.2

**Purpose:** Focus testing on the edges (boundaries) of equivalence partitions, because defects cluster at boundaries. This is where off-by-one errors and incorrect inequality operators hide.

**When to apply:**
- ALWAYS apply alongside Equivalence Partitioning for ranges
- Any numeric input with min/max constraints
- String length constraints (min/max characters)
- Date ranges
- Pagination limits
- Any ordered set with boundaries

**How to apply:**

For each boundary, test THREE values:
1. **On the boundary** (the exact boundary value)
2. **Just below** (boundary - 1 unit)
3. **Just above** (boundary + 1 unit)

The "unit" depends on data type:
- Integer: ±1
- Decimal/currency: ±0.01
- Date: ±1 day
- String length: ±1 character

**Example:**
Requirement: "Age must be 18-65 (integers)"

| Boundary | Below | On | Above |
|---|---|---|---|
| Lower (18) | 17 (invalid) | 18 (valid) | 19 (valid) |
| Upper (65) | 64 (valid) | 65 (valid) | 66 (invalid) |

Test values: {17, 18, 19, 64, 65, 66} = 6 test cases

**Additional boundaries to consider:**
- 0 (zero is often a special case)
- Empty/null
- Maximum system value (e.g., MAX_INT)
- Minimum system value (e.g., -MAX_INT)

---

## 3. Decision Table Testing

**Source:** Copeland Ch.5, ISTQB v4.0 Section 4.2.3

**Purpose:** Systematically test combinations of conditions (inputs) and their resulting actions (outputs). Ideal for business rules with multiple interacting conditions.

**When to apply:**
- Business rules with multiple conditions that affect outcomes
- Permission matrices (role + action → allowed/denied)
- Pricing rules with discounts, tiers, exceptions
- Validation rules with multiple interdependent fields
- Any "if A and B then X, but if A and not B then Y" logic

**How to apply:**

1. List all **conditions** (inputs/states that affect behavior)
2. List all **actions** (possible outcomes)
3. Create a table with all possible combinations of conditions
4. For each combination, determine the expected action(s)
5. Eliminate impossible or redundant combinations
6. Create one test case per remaining rule (row)

**Example:**
Requirement: "Free shipping if order > $100 AND customer is Premium. 10% discount if order > $100 OR customer is Premium."

| Rule | Order > $100 | Premium Customer | Free Shipping | 10% Discount |
|---|---|---|---|---|
| R1 | Yes | Yes | Yes | Yes |
| R2 | Yes | No | No | Yes |
| R3 | No | Yes | No | Yes |
| R4 | No | No | No | No |

→ 4 test cases needed (one per rule)

**For large numbers of conditions** (>4), consider collapsing the table by identifying conditions where the outcome doesn't change regardless of that condition's value (marked as "don't care" / "-").

---

## 4. State Transition Testing

**Source:** Copeland Ch.7, ISTQB v4.0 Section 4.2.4

**Purpose:** Test systems that have distinct states and transitions between them triggered by events. Catch defects in state management, invalid transitions, and missing error handling.

**When to apply:**
- Order lifecycle (created → paid → shipped → delivered → returned)
- User account states (active, suspended, banned, deleted)
- Workflow statuses (draft → review → approved → published)
- Session management (logged out → logged in → timed out)
- Any entity with a status field that changes over time
- Payment/subscription states

**How to apply:**

1. Identify all **states** the system/entity can be in
2. Identify all **events** (triggers) that cause transitions
3. Identify all **valid transitions** (state + event → new state)
4. Identify **invalid transitions** (event in a state where it shouldn't be possible)
5. Identify **guards** (conditions that must be true for a transition)
6. Create test cases for:
   - Every valid transition (at minimum)
   - Key invalid transitions (event applied in wrong state)
   - Full paths through the state diagram (sequences of transitions)

**State transition table format:**

| Current State | Event | Guard | Action | Next State |
|---|---|---|---|---|
| Draft | Submit | All fields valid | Send for review | Under Review |
| Draft | Submit | Missing fields | Show error | Draft |
| Under Review | Approve | Reviewer is authorized | Publish | Approved |
| Under Review | Reject | - | Return to author | Draft |

**Coverage levels (from Copeland):**
- **0-switch coverage:** Test every transition once (minimum)
- **1-switch coverage:** Test every pair of consecutive transitions
- **N-switch coverage:** Test sequences of N+1 transitions

For most features, 0-switch coverage + key paths + invalid transitions is sufficient.

---

## 5. Use Case Testing

**Source:** Copeland Ch.9, ISTQB v4.0 Section 4.5

**Purpose:** Test complete user transactions/journeys from start to finish. Ensures the system works as a whole for real user scenarios. This is the backbone of system and acceptance testing.

**When to apply:**
- Any user story or user flow
- Transaction processing (e.g., "User registers → verifies email → logs in → makes purchase")
- API endpoint workflows (sequence of API calls to accomplish a goal)
- Any feature described as a use case with main success scenario and alternatives

**How to apply (Cockburn/Copeland method):**

1. Identify the **use case** (goal, actor, scope)
2. Document the **Main Success Scenario** (happy path, step by step)
3. Document all **Extensions** (alternative flows and error conditions at each step)
4. For each use case, create:
   - At least **1 test case for the main success scenario**
   - At least **1 test case for each extension**
5. For data within use case steps, apply EP and BVA to enrich test cases
6. Consider **risk** — high-risk flows deserve more test combinations

**Use case template:**

```
Use Case: {Name}
Actor: {Who initiates}
Preconditions: {Required state}
Main Success Scenario:
  1. Actor does X
  2. System responds with Y
  3. Actor does Z
  4. System confirms W
Extensions:
  2a. System cannot find data → display error, return to step 1
  3a. Invalid input → display validation message
  3b. Timeout → display timeout error
```

**Test generation from use case:**
- TC1: Main path (steps 1→2→3→4) with valid data
- TC2: Extension 2a (data not found)
- TC3: Extension 3a (invalid input)
- TC4: Extension 3b (timeout scenario)
- TC5-N: Variations of main path with different EP/BVA data

**Key principle from Copeland:** "Try transactions in strange orders. Violate the preconditions. If a transaction has loops, don't just loop through once or twice — be diabolical."

---

## 6. Pairwise Testing

**Source:** Copeland Ch.6, ISTQB v4.0 (mentioned)

**Purpose:** When there are many independent parameters with discrete values, testing all combinations is infeasible. Pairwise testing ensures every pair of parameter values is tested together at least once, dramatically reducing test count while catching most interaction defects.

**When to apply:**
- Configuration testing (OS × Browser × Language × Screen resolution)
- Features with multiple independent options/settings
- API endpoints with many optional parameters
- Permission testing across multiple roles and resources
- Any situation with >3 independent parameters each with >2 values

**How to apply:**

1. List all parameters and their possible values
2. Use a pairwise algorithm (or orthogonal array) to generate the minimum set of combinations that covers all pairs
3. Create one test case per generated combination

**Example:**
Parameters: OS {Windows, Mac, Linux}, Browser {Chrome, Firefox, Safari}, Role {Admin, User}

Full combinations: 3 × 3 × 2 = 18
Pairwise: ~9 combinations cover all pairs

**When NOT to use:** If the number of combinations is already small (<20), just test all of them. Pairwise is a reduction technique for large combinatorial spaces.

---

## 7. Experience-Based Techniques

**Source:** ISTQB v4.0 Section 4.4

These complement the formal techniques above. Always add experience-based test cases after applying formal techniques.

### Error Guessing
Anticipate likely defects based on common software mistakes:
- Null/empty inputs where data is expected
- SQL injection, XSS in text fields
- Off-by-one errors in loops and ranges
- Timezone issues for date/time fields
- Unicode and special characters in text
- Concurrent modifications (two users editing same entity)
- Large data volumes
- Network interruption during multi-step flows

### Exploratory Testing Charters
For areas where requirements are vague, suggest exploratory testing charters:
"Explore {target} with {resources} to discover {information}"

### Checklist-Based Testing
Apply common checklists for:
- CRUD operations (Create, Read, Update, Delete for each entity)
- Sorting and filtering (ascending, descending, multi-column, with empty values)
- Pagination (first page, last page, out of range, page size changes)
- Search (exact match, partial, no results, special characters)

---

## 8. Technique Selection Flowchart

When analyzing a requirement, follow this decision process:

```
START with a requirement/AC
│
├─ Does it involve INPUT FIELDS with ranges/constraints?
│  YES → Apply EP + BVA for each field
│
├─ Does it involve BUSINESS RULES with multiple conditions?
│  YES → Build a Decision Table
│
├─ Does it have an entity with STATES that change?
│  YES → Create State Transition diagram and test transitions
│
├─ Is it a USER JOURNEY or TRANSACTION FLOW?
│  YES → Apply Use Case Testing (main path + all extensions)
│
├─ Are there MANY INDEPENDENT PARAMETERS with discrete values?
│  YES → Apply Pairwise Testing
│
├─ Does it involve PERMISSIONS or ROLE-BASED behavior?
│  YES → Decision Table (roles × actions × outcomes)
│
├─ Is the requirement VAGUE or INCOMPLETE?
│  YES → Apply Error Guessing + suggest Exploratory Charters
│
└─ ALWAYS supplement with Experience-Based techniques
```

**IMPORTANT:** Most real requirements trigger MULTIPLE techniques. A registration form needs EP+BVA for fields, decision tables for validation rules, use case testing for the flow, and state transition for account states. Apply ALL that are relevant.
