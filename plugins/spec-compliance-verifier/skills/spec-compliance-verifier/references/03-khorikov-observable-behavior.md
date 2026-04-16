# B3 — Khorikov, *Unit Testing: Principles, Practices, and Patterns* (Manning, 2020)

Source for stages **S3 (Behavior Model)** and **S6 (Verdict)**.

## Techniques

### `observable_behavior_filter` [S3, S6]

Classify each candidate assertion: it targets observable behavior only if it ties directly to a client goal.

**Procedure:**
1. Identify the client of the code under test.
2. State the client's goal in one sentence.
3. Ask whether the candidate assertion verifies an operation or state the client uses to achieve that goal.
4. If yes, mark it COMPLIANT (observable behavior) and keep it.
5. If no (intermediate step, private field, collaborator interaction), mark it VIOLATED (implementation detail) and drop it.
6. Replace dropped checks with an assertion on the end result the client actually receives.

**Counterexample shape:** Test turns red after a pure refactoring while the caller-visible result is unchanged.
**NestJS/TS mapping:** At the HTTP boundary, keep supertest assertions on response status, body shape, and headers. Reject spy-on-private, provider-internal call counts, or repository method spying when the DB is managed.
**Book anchor:** Ch. 5 sec. 5.2.

### `four_pillars_scoring` [S6]

Score every test against protection-against-regressions, resistance-to-refactoring, fast feedback, and maintainability.

**Procedure:**
1. Rate protection against regressions (how much code + edge cases exercised).
2. Rate resistance to refactoring (false positives under plausible refactorings).
3. Rate fast feedback (wall-clock execution time).
4. Rate maintainability (test size and setup complexity).
5. Treat resistance-to-refactoring as non-negotiable; flag any zero.
6. Trade protection vs feedback based on layer.

**Counterexample shape:** A test that catches bugs but breaks on every rename — brittle; rewrite or delete.
**NestJS/TS mapping:** Prefer integration tests of controllers via supertest (high protection + high resistance) over isolated service unit tests that mock every provider.
**Book anchor:** Ch. 4 secs. 4.1–4.4.

### `end_result_redirection` [S6]

When an assertion couples to algorithm steps, redirect it to the final output the caller consumes.

**Procedure:**
1. Locate assertions inspecting intermediate variables, sub-renderers, internal collections, or algorithm order.
2. Identify the single end result the caller receives.
3. Rewrite the assertion to compare the full end result to an expected value.
4. Remove redundant checks on algorithm internals.
5. Re-run the test under a no-op refactoring to confirm green.

**NestJS/TS mapping:** In supertest, assert on `response.body` and `response.status` rather than `vi.spyOn` of a service method.
**Book anchor:** Ch. 4 sec. 4.1.4.

### `intra_vs_inter_system_rule` [S3, S6]

Mock only communications that cross the system boundary to unmanaged dependencies; never mock intra-system collaborations.

**Procedure:**
1. Draw the system boundary around your deployable application.
2. Classify each dependency as intra-system or inter-system.
3. For inter-system, classify as managed (only your app accesses it) or unmanaged (other apps observe it).
4. Allow mocks and interaction assertions ONLY for unmanaged dependencies.
5. For managed dependencies, use the real instance and assert final state.
6. For intra-system collaborators, use real instances.

**Counterexample shape:** Test verifies `UserService` called `UserRepository.save()` — intra-system/managed coupling; must be removed.
**NestJS/TS mapping:** Mock outbound HTTP clients, SQS/Kafka producers, third-party SDKs. Use real Postgres via testcontainers and real internal providers. Do not assert on `repository.save()` calls.
**Book anchor:** Ch. 5 sec. 5.3; Ch. 8 sec. 8.2.

### `black_box_authoring` [S3, S6]

Write tests from the public contract's perspective; use white-box tools only to spot coverage gaps.

**Procedure:**
1. Start from the acceptance criteria or API contract, not the implementation.
2. Write each test using only public API inputs and observable outputs.
3. Run coverage analysis after the initial suite.
4. For each uncovered branch, re-derive an input scenario from the contract.
5. Never import private symbols or assert on internal call order to close coverage.

**NestJS/TS mapping:** Drive NestJS tests only through HTTP (supertest) or the controller's public method. Never use `(service as any).privateMethod`.
**Book anchor:** Ch. 4 sec. 4.5.2.

### `no_private_method_tests` [S6]

Do not test private methods or expose private state for tests.

**Procedure:**
1. Scan tests for calls to private/protected members or reflective access.
2. Scan production code for members made public or internal solely for testing.
3. Delete such tests and restore original access modifiers.
4. Cover the logic indirectly through the public API.
5. If logic is too complex to cover indirectly, extract a new class with its own public API.

**NestJS/TS mapping:** Reject PRs that use `vi.spyOn(service as any, 'privateHelper')` or export internals only for tests. Extract helpers into a separate `@Injectable` provider if they need direct testing.
**Book anchor:** Ch. 11 sec. 11.1–11.2.

### `no_domain_knowledge_leak` [S6]

Tests must not re-implement the algorithm they verify; use precomputed literal expected values.

**Procedure:**
1. Inspect the assert phase for loops, arithmetic, or copies of SUT formulas.
2. Replace any recomputed expected value with a hardcoded literal.
3. Name the constant after the business scenario.
4. Confirm the test would fail if the SUT's algorithm silently changed coefficients.

**NestJS/TS mapping:** In supertest body assertions, hardcode `{ total: 119.99 }` rather than recomputing from request inputs inside the test.
**Book anchor:** Ch. 11 sec. 11.3.

### `humble_controller_boundary` [S3, S6]

Keep controllers thin and test them with integration tests at the HTTP boundary; unit-test only the domain model underneath.

**Procedure:**
1. Identify the controller (thin orchestration) vs. the domain model (rich logic).
2. Move branching and calculations into domain objects.
3. Cover the domain model with fast unit tests using real collaborators.
4. Cover the controller with a single integration test per longest happy path.
5. Skip trivial controller edge cases that crash fast.

**NestJS/TS mapping:** Bootstrap the AppModule with supertest, use Testcontainers for Postgres, mock only outbound HTTP/queue clients. Assert on response status + body and on emitted mock calls for unmanaged deps only.
**Book anchor:** Ch. 8 secs. 8.1–8.3.

### `explicit_time_dependency` [S6]

Inject time as an explicit dependency; never read static `now()` in SUT or tests.

**Procedure:**
1. Find calls to `Date.now`, `new Date()`, or static time providers in SUT.
2. Introduce a clock provider or accept a Date parameter.
3. In production, inject the real clock; in tests, inject a fixed instant.
4. Prefer passing a plain value over a service when the operation only needs one timestamp.
5. Remove ambient context singletons introduced solely for tests.

**NestJS/TS mapping:** Provide a `CLOCK` token in NestJS; in supertest tests, override the provider with a fixed Date. Do not monkey-patch global Date.
**Book anchor:** Ch. 11 sec. 11.5.

### `mock_only_unmanaged_outbound` [S3, S6]

Use mocks to verify outbound calls to unmanaged dependencies; for managed, assert on final persisted state.

**Procedure:**
1. List each assertion involving a test double.
2. If the double stands in for an unmanaged dep, assert the exact outbound message/contract.
3. If the double stands in for a managed dep, replace with a real instance and assert by re-reading state.
4. If the double stands in for an intra-system class, delete the mock.
5. Keep outbound-contract assertions at the edge of the system.

**NestJS/TS mapping:** Assert `mockSqsClient.send` was called with exact payload (unmanaged); re-query Postgres via TypeORM to confirm persistence (managed).
**Book anchor:** Ch. 5 sec. 5.4; Ch. 8 sec. 8.2.

## Anti-patterns B3 warns against

- Asserting on implementation details (internal collaborations, algorithm steps, private fields).
- Testing private methods directly or exposing them for tests.
- Exposing private state solely to enable assertions.
- Leaking domain knowledge: recomputing expected values in the test.
- Code pollution: adding production code only to support tests.
- Mocking concrete classes with CallBase=true.
- Ambient/static context for current time instead of injection.
- Mocking managed dependencies and asserting on call counts.
- Mocking intra-system collaborators (London-school overuse).
- Interfaces for out-of-process dependencies that are never mocked.
- Asserting interactions with stubs.
- Tolerating accumulating false positives from brittle tests.

## Vocabulary

- **Observable behavior**: Code that helps a client achieve a goal.
- **Implementation detail**: Anything not observable behavior; internal.
- **Four pillars**: Protection-against-regressions, resistance-to-refactoring, fast feedback, maintainability.
- **False positive**: Test fails while production is correct (brittle).
- **False negative**: Test passes despite broken behavior.
- **Brittle test**: Good regression protection, low resistance-to-refactoring.
- **Classical (Detroit) school**: Isolate tests; unit = unit of behavior; replace shared deps.
- **London (mockist) school**: Isolate SUT; unit = class; replace all non-immutable deps.
- **Over-specification**: Coupling tests to implementation.
- **Unit of behavior**: A behavior meaningful to a domain expert.
- **Intra-system communication**: Between classes in the deployable; always implementation detail.
- **Inter-system communication**: Across process boundaries.
- **Managed dependency**: Out-of-process, accessed only through your app (e.g. your DB).
- **Unmanaged dependency**: Out-of-process, observable by other systems (message bus, third-party API).
- **Well-designed API**: Public surface = observable behavior.
- **Black-box testing**: Through the public contract.
- **White-box testing**: Informed by internal structure; for coverage analysis only.
- **Code pollution**: Production code added solely to support tests.
- **Humble controller**: Thin orchestration with no logic.

## How this maps into the pipeline

| Stage | Techniques used |
|-------|-----------------|
| S3 Behavior Model | `observable_behavior_filter`, `intra_vs_inter_system_rule`, `humble_controller_boundary`, `mock_only_unmanaged_outbound`, `black_box_authoring` |
| S6 Verdict | `observable_behavior_filter` (classify each check), `four_pillars_scoring` (flag brittle), `end_result_redirection`, `no_private_method_tests`, `no_domain_knowledge_leak`, `explicit_time_dependency`, `mock_only_unmanaged_outbound` |
