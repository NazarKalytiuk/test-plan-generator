# Test Case Template and Output Examples

This reference shows the exact markdown format for test plan output and provides a complete example.

## Individual Test Case Format

```markdown
**TC-{SUITE_ID}-{NUMBER}: {Descriptive title that explains what is being tested}**
- **Priority:** Critical | High | Medium | Low
- **Technique:** EP | BVA | Decision Table | State Transition | Use Case | Pairwise | Error Guessing
- **Preconditions:** {State required before executing this test}
- **Steps:**
  1. {Specific action with concrete data}
  2. {Next action}
  3. {Verification action}
- **Expected Result:** {Clear, observable, verifiable outcome}
- **Requirement:** {Traces to specific AC or requirement from the ticket}
```

## Priority Guidelines

| Priority | Criteria | Examples |
|---|---|---|
| Critical | Core functionality, data loss risk, security | Login, payment processing, data corruption scenarios |
| High | Important functionality, regression risk | Main user flows, key business rules |
| Medium | Supporting functionality, moderate impact | Validation messages, sorting, filtering |
| Low | Edge cases, cosmetic, nice-to-have | UI text, rare edge cases, tooltip content |

## Complete Example

Below is a truncated example for a feature "User Registration" to show structure and depth:

---

```markdown
# Test Plan: User Registration

## 1. Overview
- **Feature:** User registration with email verification
- **Source:** PROJ-1234 (https://company.atlassian.net/browse/PROJ-1234)
- **Date:** 2026-04-07
- **Test Approach:** Equivalence Partitioning and Boundary Value Analysis for all input fields; Decision Table for validation rules; Use Case Testing for registration flow; State Transition for account states
- **Total Test Cases:** 47

## 2. Scope
### In Scope
- Registration form validation (all fields)
- Email verification flow
- Account creation in database
- Duplicate email handling
- Password strength requirements
- Terms of service acceptance

### Out of Scope
- Social login (covered by PROJ-1250)
- Email template design (covered by PROJ-1248)
- Post-registration onboarding flow

## 3. Test Environment & Preconditions
- API endpoint: POST /api/v1/users/register
- Email testing service configured (e.g., Mailhog)
- Database accessible for verification
- No existing user with test emails

## 4. Test Suites

### 4.1 Email Field Validation (12 test cases)
**Applicable techniques:** EP, BVA
**Risk level:** High

**TC-EMAIL-01: Valid email format accepted**
- **Priority:** Critical
- **Technique:** EP (valid partition)
- **Preconditions:** Registration page is open
- **Steps:**
  1. Enter "user@example.com" in email field
  2. Fill all other required fields with valid data
  3. Submit the form
- **Expected Result:** Form submits successfully, no validation error on email field
- **Requirement:** AC-1: "User must provide a valid email address"

**TC-EMAIL-02: Email without @ symbol rejected**
- **Priority:** High
- **Technique:** EP (invalid partition — missing structure)
- **Preconditions:** Registration page is open
- **Steps:**
  1. Enter "userexample.com" in email field
  2. Attempt to submit the form
- **Expected Result:** Validation error: "Please enter a valid email address"
- **Requirement:** AC-1

**TC-EMAIL-03: Email without domain rejected**
- **Priority:** High
- **Technique:** EP (invalid partition — incomplete domain)
- **Preconditions:** Registration page is open
- **Steps:**
  1. Enter "user@" in email field
  2. Attempt to submit the form
- **Expected Result:** Validation error displayed
- **Requirement:** AC-1

**TC-EMAIL-04: Empty email rejected**
- **Priority:** Critical
- **Technique:** BVA (empty — below minimum length)
- **Preconditions:** Registration page is open
- **Steps:**
  1. Leave email field empty
  2. Attempt to submit the form
- **Expected Result:** Validation error: "Email is required"
- **Requirement:** AC-1

**TC-EMAIL-05: Email at maximum length boundary (254 chars)**
- **Priority:** Medium
- **Technique:** BVA (upper boundary)
- **Preconditions:** Registration page is open
- **Steps:**
  1. Enter a valid email of exactly 254 characters
  2. Submit the form
- **Expected Result:** Email accepted, registration proceeds
- **Requirement:** AC-1

**TC-EMAIL-06: Email exceeding maximum length (255+ chars)**
- **Priority:** Medium
- **Technique:** BVA (above upper boundary)
- **Preconditions:** Registration page is open
- **Steps:**
  1. Enter a valid-format email of 255+ characters
  2. Submit the form
- **Expected Result:** Validation error or truncation handling
- **Requirement:** AC-1

**TC-EMAIL-07: Duplicate email rejected**
- **Priority:** Critical
- **Technique:** Decision Table (existing email + valid format → reject)
- **Preconditions:** User with "existing@example.com" already registered
- **Steps:**
  1. Enter "existing@example.com" in email field
  2. Fill all other fields validly
  3. Submit the form
- **Expected Result:** Error: "An account with this email already exists"
- **Requirement:** AC-2: "System must prevent duplicate registrations"

...

### 4.2 Password Validation (10 test cases)
**Applicable techniques:** EP, BVA, Decision Table
**Risk level:** High

...

### 4.3 Registration Flow — Happy Path (8 test cases)
**Applicable techniques:** Use Case Testing
**Risk level:** Critical

...

### 4.4 Account State Transitions (7 test cases)
**Applicable techniques:** State Transition
**Risk level:** High

**TC-STATE-01: New registration creates account in "Pending Verification" state**
- **Priority:** Critical
- **Technique:** State Transition (initial state)
- **Preconditions:** No existing account for test email
- **Steps:**
  1. Complete registration with valid data
  2. Query account state in database
- **Expected Result:** Account exists with status = "pending_verification"
- **Requirement:** AC-5: "Newly registered accounts must verify email"

**TC-STATE-02: Email verification transitions account to "Active"**
- **Priority:** Critical
- **Technique:** State Transition (Pending → Active)
- **Preconditions:** Account in "pending_verification" state
- **Steps:**
  1. Click verification link from email
  2. Query account state
- **Expected Result:** Account status = "active", user can log in
- **Requirement:** AC-5

**TC-STATE-03: Expired verification link does not activate account**
- **Priority:** High
- **Technique:** State Transition (invalid transition — expired event)
- **Preconditions:** Account in "pending_verification" state, 24+ hours have passed
- **Steps:**
  1. Click expired verification link
- **Expected Result:** Error: "Verification link has expired", account remains "pending_verification"
- **Requirement:** AC-6

...

### 4.5 Error Handling and Edge Cases (10 test cases)
**Applicable techniques:** Error Guessing, Experience-Based
**Risk level:** Medium

...

## 5. Traceability Matrix

| Requirement / AC | Test Cases | Coverage |
|---|---|---|
| AC-1: Valid email required | TC-EMAIL-01 to TC-EMAIL-06 | Full |
| AC-2: No duplicate emails | TC-EMAIL-07 | Full |
| AC-3: Password strength rules | TC-PASS-01 to TC-PASS-10 | Full |
| AC-4: Terms must be accepted | TC-FLOW-05 | Full |
| AC-5: Email verification required | TC-STATE-01, TC-STATE-02 | Full |
| AC-6: Verification link expiry | TC-STATE-03 | Full |

## 6. Risks and Assumptions
- **Assumption:** Email delivery is tested separately (out of scope for this plan)
- **Risk:** Password requirements not fully specified — assumed minimum 8 chars, 1 uppercase, 1 number based on industry standard
- **Gap:** No accessibility requirements specified in ticket — added basic keyboard navigation tests as Low priority
```

---

## Naming Conventions

- Suite IDs: Short uppercase identifiers reflecting the area (EMAIL, PASS, FLOW, STATE, API, PERM, EDGE)
- Test case numbers: Sequential within suite (01, 02, 03...)
- Full ID format: TC-{SUITE}-{NUMBER} (e.g., TC-EMAIL-01, TC-STATE-03)

## Language Rules

- Write test cases in the same language as the original requirements
- If requirements mix languages, default to the dominant language
- Technical terms (API names, field names, status codes) stay in original form regardless of language
