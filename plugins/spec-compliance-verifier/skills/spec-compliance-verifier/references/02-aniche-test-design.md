# B2 — Aniche, *Effective Software Testing: A Developer's Guide* (Manning, 2022)

Source for stage **S4 (Test Enumeration)** and for the test-smell rules applied in **S6 (Verdict)**.

## Techniques

### `aniche_seven_step_spec_testing` [S4]

Systematic recipe for deriving black-box tests from a specification.

**Procedure:**
1. Understand the requirements, inputs, and outputs of the feature.
2. Explore what the program does for a handful of concrete sample inputs.
3. Identify input and output partitions (equivalence classes) per parameter and across parameters.
4. Analyze boundaries between adjacent partitions and list on/off (and optional in/out) points.
5. Devise concrete test cases by pragmatically combining partitions, isolating exceptional cases.
6. Automate each case as a named unit test (parameterize when the skeleton repeats).
7. Augment the suite with creativity and corner cases the steps missed.

**Counterexample shape:** A test input from an unexplored partition returns a wrong status code or body the spec forbids.
**NestJS/TS mapping:** Vitest `describe` per area; each test case as `it.each`; drive the controller via `supertest(app.getHttpServer())` against a `Test.createTestingModule`.
**Book anchor:** Chapter 2 sections 2.1.1–2.1.7 and 2.2.

### `equivalence_partitioning` [S4]

Split each input and output domain into classes that the program likely treats identically and pick one representative per class.

**Procedure:**
1. Enumerate each parameter and the output.
2. List value groups the spec should handle the same way (null, empty, length=1, length>1, matching vs. non-matching).
3. Reflect on output partitions to surface input partitions you missed.
4. Select one representative per partition.
5. Mark exceptional partitions (null, empty, negative) for isolated tests.
6. Move representatives into concrete test cases.

**Counterexample shape:** Two inputs from the same partition produce different responses, or a representative is rejected while spec says accept.
**NestJS/TS mapping:** Encode partitions as a const fixtures array; feed via `it.each` to a supertest call.
**Book anchor:** Chapter 2 section 2.1.3.

### `boundary_value_analysis` [S4]

Wherever partitions meet, test the point on the boundary and the nearest point in the other partition.

**Procedure:**
1. For every partition pair, locate the condition expression (e.g., `len >= 10`).
2. Pick the on point: the value that makes the condition true and lies on the boundary.
3. Pick the off point: the closest value in the opposite partition.
4. For equality conditions, use one on point and two off points (one on each side).
5. Optionally add in/out points for clarity.
6. Write one test per selected point, naming it by boundary and side.

**Counterexample shape:** Endpoint accepts an off point the spec forbids (or rejects an on point the spec permits).
**NestJS/TS mapping:** Express ranges with class-validator on DTOs; drive boundary inputs through supertest; assert 400 ValidationPipe errors vs 2xx per side.
**Book anchor:** Chapter 2 section 2.1.4 and 2.4.4.

### `category_partition_combination` [S4]

Group parameters into categories, list partitions per category, combine them with pragmatic constraints.

**Procedure:**
1. Define categories: one per input parameter plus cross-parameter relationships.
2. List partitions inside each category.
3. Annotate "only once" partitions (nulls, empties) that must not be fully combined.
4. Compute the cartesian product as candidates.
5. Drop combinations that are logically equivalent or unreachable.
6. Emit surviving combinations as numbered test cases.

**Counterexample shape:** A combination that passed individual-field validation but the endpoint misbehaves because of an inter-field rule.
**NestJS/TS mapping:** Model categories as TypeScript union types; generate combinations with a helper; run `it.each` through supertest.
**Book anchor:** Chapter 2 section 2.1.5 and 2.4.6.

### `state_aware_spec_testing` [S4]

When behavior depends on prior state, partition the resource state before invoking the method.

**Procedure:**
1. Identify states the resource can be in before the call.
2. Partition each relevant state dimension.
3. For each state partition, script the setup sequence.
4. Combine state partitions with input partitions; prune impossible combinations.
5. Call the method under test; assert returned value and new observable state.
6. Include transitions across boundaries (empty→one item, last-item→empty).

**Counterexample shape:** Endpoint returns correct data for a fresh resource but wrong output after a state-changing prior call.
**NestJS/TS mapping:** Nest `TestingModule` with real or in-memory repository; `beforeEach` drives state via supertest POSTs; assert GET/PATCH under test shows expected post-state.
**Book anchor:** Chapter 2 section 2.4.12.

### `pragmatic_combination_pruning` [S4]

Isolate exceptional partitions and break methods apart when combinations explode.

**Procedure:**
1. Compute the nominal cartesian product and estimate test count.
2. Move exceptional values (null, empty) into single-shot tests.
3. Apply domain knowledge to drop combinations that cannot vary behavior.
4. If combinations still explode, split the endpoint/method.
5. Re-derive tests for each smaller contract; add a thin integration test across them.

**Counterexample shape:** A combination pruned-as-equivalent actually triggers a distinct code path.
**NestJS/TS mapping:** Keep a pruned `it.each`; when still coarse, split a fat controller into service methods with their own unit tests plus one supertest integration case.
**Book anchor:** Chapter 2 section 2.4.6.

### `parameterized_same_seed` [S4]

Collapse structurally identical tests into one parameterized test and reuse one seed input, mutating only what the partition requires.

**Procedure:**
1. Detect tests sharing arrange/act/assert skeleton differing only in input and expected output.
2. Pick a single seed input that works for the default partition.
3. For each partition, derive the minimum mutation needed.
4. Put (input, expected) tuples in a parameter table with a descriptive name per row.
5. Implement one parameterized test body using that table.
6. Keep truly idiosyncratic cases as their own named tests.

**NestJS/TS mapping:** `it.each([['label', body, expectedStatus, expectedBody], ...])` around a supertest call; rely on row labels in failure output.
**Book anchor:** Chapter 2 sections 2.4.5 and 2.4.10.

### `sensitive_assertion_refactor` [S6]

Replace brittle string/whole-body assertions with named, intent-revealing matchers.

**Procedure:**
1. Locate assertions checking formatted strings or full response snapshots.
2. Identify the business-meaningful facts the test really needs.
3. Wrap each fact in a custom matcher/helper.
4. Rewrite tests to chain these matchers.
5. When response format changes, update matchers once, not every test.

**NestJS/TS mapping:** Write Vitest `expect.extend` matchers (e.g., `toBeValidationError(field)`, `toHaveGrade(n)`); apply to supertest `response.body`.
**Book anchor:** Chapter 10 section 10.2.5.

### `self_contained_fixture` [S4]

Each test should set up every external resource it needs.

**Procedure:**
1. Enumerate every external dependency the test touches.
2. Write explicit setup code that creates required state from scratch.
3. Abstract complex setup into builders/helpers.
4. Teardown or reset state after the test.
5. Replace uncontrollable externals with stubs/mocks.

**NestJS/TS mapping:** `TestingModule` with `overrideProvider`; wrap DB setup in a `testDb` helper using TypeORM/Prisma; `beforeEach` truncates and seeds; mock external HTTP with nock.
**Book anchor:** Chapter 10 section 10.2.3.

### `specific_cohesive_fixture` [S4]

Build the smallest fixture that exercises this test's partition; use Test Data Builders.

**Procedure:**
1. For each test, list the fields that influence behavior.
2. Start from a minimal builder with sensible defaults.
3. Override only the fields relevant to that partition.
4. Avoid large, shared fixtures at class/file scope.
5. Share builders but call them per test.

**NestJS/TS mapping:** `aRequest().withUserId(x).withAmount(-1).build()` helpers; pass output to supertest `.send()`.
**Book anchor:** Chapter 10 section 10.2.4.

### `flaky_test_hardening` [S6]

Make tests repeatable by eliminating time, order, randomness, and network nondeterminism.

**Procedure:**
1. Detect flakiness: re-run suite multiple times; mark intermittents.
2. Classify by cause (async waits, time, random seed, test order, external resource).
3. Remove sleeps in favor of deterministic awaits.
4. Freeze clocks and seed RNGs per test.
5. Isolate external services via mocks; gate with skip-with-reason if unavoidable.
6. Re-run hardened test dozens of times before CI reintroduction.

**NestJS/TS mapping:** `vi.useFakeTimers()`, supertest's await chain, nock for HTTP, `--runInBand` only as last resort.
**Book anchor:** Chapter 10 section 10.1.4.

## Anti-patterns B2 warns against

- Blindly combining every partition (combinatorial explosion).
- Testing null/empty at layers where upstream guarantees they cannot occur.
- Forcing "one assertion per test" dogmatically.
- Asserting against full response strings or snapshots (sensitive assertions).
- Excessive duplication when a parameterized test would serve.
- Resource optimism: assuming DB/file/service is already in the right state.
- Mystery guests: implicit fixture files or env state.
- General shared fixtures mixed across many tests.
- Tolerating flaky tests in CI.
- Arbitrary input variation instead of a shared seed mutated minimally.
- Needlessly complex input values when a small realistic value would do.

## Vocabulary

- **Specification-based testing**: Black-box derivation from stated requirements.
- **Partition (equivalence class)**: Subset the program handles uniformly.
- **Boundary**: Edge between adjacent partitions.
- **On point**: Value on the boundary.
- **Off point**: Closest value in the opposite partition.
- **In point / Out point**: Values clearly inside/outside the partition.
- **Category**: Parameter or grouping with partitions (Ostrand & Balcer).
- **Fixture**: Input values and prepared state.
- **Test Data Builder**: Pattern for minimal, intention-revealing fixtures.
- **Parameterized test**: Single body over a table of (input, expected) rows.
- **Soft assertion**: Records failure without aborting.
- **Test smell**: Recurring poor pattern in test code.
- **Mystery guest / Resource optimism / General fixture**: Specific smells.
- **Sensitive assertion**: Breaks on cosmetic changes.
- **Flaky test**: Non-deterministic pass/fail.
- **Larger test**: Crosses system boundaries (DB, HTTP).

## How this maps into the pipeline

| Stage | Techniques used |
|-------|-----------------|
| S4 Test Enumeration | `aniche_seven_step_spec_testing`, `equivalence_partitioning`, `boundary_value_analysis`, `category_partition_combination`, `state_aware_spec_testing`, `pragmatic_combination_pruning`, `parameterized_same_seed`, `self_contained_fixture`, `specific_cohesive_fixture` |
| S6 Verdict | `sensitive_assertion_refactor` (flag brittle assertions in the diff), `flaky_test_hardening` (flag non-deterministic code paths) |
