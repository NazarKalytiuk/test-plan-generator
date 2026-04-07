# Quality Characteristics Reference

When analyzing requirements, consider whether non-functional quality characteristics are mentioned or implied. This helps generate test cases beyond pure functional testing.

Based on: Winteringham "Testing Web APIs" Ch.3, ISO/IEC 25010, ISTQB v4.0 Ch.2

## Core Quality Characteristics

### Functional Suitability
- **Completeness** — Does the feature cover all specified tasks and user objectives?
- **Correctness** — Does it produce correct results with required precision?
- **Appropriateness** — Does it facilitate the user's task?

Test focus: All functional test cases cover this. Ensure no specified behavior is missing from the test plan.

### Performance
- **Response time** — How fast does the system respond under normal load?
- **Throughput** — How many transactions/requests per second?
- **Resource utilization** — CPU, memory, disk usage under load

Test focus: If requirements mention SLAs, response times, or "must handle X concurrent users", create specific performance test cases with measurable thresholds.

### Security
- **Authentication** — Can unauthorized users access protected resources?
- **Authorization** — Can users access only what their role permits?
- **Data protection** — Is sensitive data encrypted, masked, or properly handled?
- **Input validation** — Is the system resistant to injection attacks?

Test focus: If the feature involves user data, authentication, or API endpoints, add test cases for:
- Unauthenticated access attempts
- Cross-role access attempts (user trying admin actions)
- SQL injection / XSS in text inputs
- Sensitive data exposure in API responses

### Usability
- **Learnability** — How easy is it for new users?
- **Error prevention** — Does the UI prevent mistakes?
- **Error recovery** — Can users recover from errors gracefully?
- **Accessibility** — WCAG compliance, screen reader support

Test focus: If requirements mention UX or the feature has a UI component, add test cases for clear error messages, keyboard navigation, and common accessibility checks.

### Reliability
- **Availability** — Does the system handle failures gracefully?
- **Fault tolerance** — What happens when dependencies fail?
- **Recoverability** — Can the system recover from crashes?

Test focus: Add error guessing test cases for: network failures mid-operation, database connection loss, timeout handling, retry behavior.

### Compatibility
- **Browser/OS compatibility** — Works across specified environments
- **API backward compatibility** — Existing clients still work
- **Data format compatibility** — Handles different data formats

Test focus: If requirements specify supported environments, add pairwise test cases for browser/OS/device combinations.

### Maintainability
- **API versioning** — Are endpoints versioned?
- **Logging** — Are operations logged for debugging?

Test focus: Usually out of scope for functional test plans, but note if logging requirements exist.

## How to Use This Reference

When generating a test plan:

1. Read the requirements and identify which quality characteristics are explicitly mentioned
2. For each mentioned characteristic, add test cases in the appropriate test suite
3. For characteristics NOT mentioned but commonly expected (security for any auth feature, basic error handling for any API), add test cases and note the assumption in "Risks and Assumptions"
4. Do NOT add test cases for characteristics that are clearly out of scope or irrelevant

## Risk-Based Prioritization

Use quality characteristics to assess risk:

| Quality Characteristic | Business Impact if Failing | Typical Priority |
|---|---|---|
| Functional Correctness | Users cannot complete tasks | Critical |
| Security (auth/authz) | Data breach, compliance violation | Critical |
| Performance (SLA) | Revenue loss, user churn | High |
| Reliability (availability) | Service outage | High |
| Usability (error handling) | Support tickets, user frustration | Medium |
| Compatibility | Subset of users affected | Medium |
| Accessibility | Compliance risk, exclusion | Medium-High |

## API-Specific Quality Characteristics

For API features specifically (from Winteringham):

- **Contract adherence** — Does the API response match the documented schema?
- **Error response quality** — Are error codes correct (400 vs 500)? Are error messages helpful?
- **Idempotency** — For PUT/DELETE, does repeating the request produce the same result?
- **Pagination** — Does pagination work correctly with edge cases (empty results, last page)?
- **Rate limiting** — Does the API handle excessive requests gracefully?
- **CORS** — Are cross-origin headers configured correctly?
- **Content negotiation** — Does the API respond to Accept headers properly?

Add these as test cases when the feature involves API endpoints.
