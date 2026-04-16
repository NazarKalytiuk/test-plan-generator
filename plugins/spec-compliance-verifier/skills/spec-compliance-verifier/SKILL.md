---
name: spec-compliance-verifier
description: USE WHEN reviewing whether a code change — typically a NestJS controller/service implementing a REST endpoint — correctly satisfies a Jira user story. Produces a deterministic JSON verdict (COMPLIANT / VIOLATED / UNDETERMINED per check) with counterexamples. Triggers on phrases like "verify code against story", "does this implement the ticket", "spec compliance check", "review story against diff". Single pass, no multi-turn interaction with the user.
---

# spec-compliance-verifier

Verify that a NestJS/TypeScript code change correctly implements a Jira user story describing a REST endpoint's request/response behavior. Emit a deterministic JSON verdict.

## 1. When to use / when not to use

Use when:
- A user story (Jira ticket, pasted text, or markdown) describes a REST endpoint in English or Ukrainian.
- A code change (diff, full file, or folder) implements it in NestJS + TypeScript.
- The user asks "does this implement the story?" or equivalent.

Do NOT use for:
- Non-functional concerns (performance, latency, throughput).
- Security review (authn, authz, injection) — delegate to a security-review skill.
- Architecture / layering conformance.
- Code style / linting.
- Stories that only touch frontend code, migration scripts, or infrastructure.

## 2. Inputs

Required input envelope — see `schemas/input.schema.json` for the strict shape:

```json
{
  "story": { "text": "As a ... I want ... so that ...", "language": "en|uk|auto" },
  "code": { "files": [{"path": "src/orders/orders.controller.ts", "content": "..."}] },
  "mode": "static|executable|auto",
  "openapi": "optional YAML/JSON schema",
  "entity_dependency_map": { "ordersRepository": "managed", "sqsClient": "unmanaged" }
}
```

If `mode` is `auto`, apply the selection rule from §5. If `openapi` is absent, infer DTOs from controller signatures. If `entity_dependency_map` is absent, assume `typeorm|prisma|mongoose` repositories are managed and any HTTP/queue client is unmanaged.

## 3. Pipeline overview

Six sequential stages. Each stage consumes the previous stage's output. Do not skip a stage. Do not reorder. [B1,B2,B3,B4,B5]

- **S1 Story Parsing** — Extract actors, operation, data, acceptance criteria. [B1]
- **S2 Ambiguity Detection** — Formalize AC as predicates; detect under-specification and contradictions. Abort-with-report on critical gaps. [B5]
- **S3 Behavior Model** — Write preconditions, postconditions, frame conditions, observable-behavior boundary. [B3,B5]
- **S4 Test Enumeration** — Derive concrete test cases via EP, BVA, category-partition, state transitions. [B2]
- **S5 Property Derivation** — Derive invariants, round-trip, stateful-command, and model-based properties beyond S4. [B4]
- **S6 Verdict** — Per check classify COMPLIANT / VIOLATED / UNDETERMINED with counterexample and book citations. [B1,B3]

## 4. Detailed stages

### S1 — Story Parsing

- Read `templates/stage-1-story-parse.md` and follow it verbatim.
- Detect language of `story.text`. If Ukrainian, translate each AC into English internally; keep the original nouns/verbs in the glossary so the S6 output speaks the user's Ubiquitous Language. [B1 ubiquitous_language_in_specs]
- Derive scope from the story's "in order to" clause (the goal). Reject ACs that describe solutions instead of goals. [B1 derive_scope_from_goals]
- For each AC, write a Given-When-Then restatement with exactly one `When`. If the AC has multiple `When` steps, it is a script, not a spec — split it or fold incidentals into `Given`. [B1 given_when_then_structure, B1 scripts_are_not_specifications]
- Produce key examples: one happy-path, one negative, one boundary. Use concrete values, never abstract classes like "less than 10". [B1 illustrate_with_key_examples, B1 dont_overspecify_happy_path_first]
- **STATIC branch**: emit the parsed structure as JSON.
- **EXECUTABLE branch**: no code generated here; the parsed structure is input to S2–S6.
- **Inputs**: `story.text`, `story.language`, optional `openapi`.
- **Outputs**: `{ actors, operation, endpoint, method, inputs[], outputs[], ac[], glossary }`.
- **Pass criteria**: every AC has a G-W-T restatement and every domain noun has a glossary entry.
- **Source book**: `references/01-adzic-key-examples.md`.

### S2 — Ambiguity Detection

- Read `templates/stage-2-ambiguity.md` and follow it verbatim.
- For each AC, split into atomic sub-requirements. Name each atomic proposition (e.g. `isAdmin(u)`, `amount > 0`, `status == 'PENDING'`). [B5 ambiguity_detection_via_predicates]
- Combine propositions explicitly with `&&`, `||`, `=>`. If the English reads ambiguously (e.g. "A and B or C"), enumerate the plausible formalizations. If more than one is defensible, emit a `blocking_question` listing both formalizations and naming the AC. [B5 ambiguity_detection_via_predicates]
- Build a decision table when the AC branches on ≤ 5 finite inputs. Check soundness (no two rows with the same inputs and different outputs) and completeness (every input combination has a row). Unsound or incomplete ⇒ emit `blocking_question` citing the missing or contradictory tuple. [B5 decision_table_validity]
- Check the conjunction of all AC predicates for satisfiability. If no assignment satisfies all AC simultaneously, the story is contradictory — emit a `blocking_question` with the witness. [B5 contradiction_detection_via_unsat]
- **Abort flag**: if ≥ 1 must-have AC is ambiguous or contradictory, set `abort: true` on the stage output. S6 must return UNDETERMINED for every check derived from that AC; do not proceed to write tests for it.
- **STATIC branch**: LLM reasons in natural language using predicate notation.
- **EXECUTABLE branch**: emit a small `fast-check` property that asserts all predicates simultaneously; any shrunk failing case is the contradiction witness. Use an exhaustive TS `switch` over discriminated unions for decision tables; `never` default catches missing cases at compile time. [B5 contradiction_detection_via_unsat, B4 invariant_properties]
- **Inputs**: S1 output.
- **Outputs**: `{ predicates[], decision_table?, blocking_questions[], abort }`.
- **Pass criteria**: if `abort: false`, every AC has at least one canonical predicate. If `abort: true`, `blocking_questions[]` is non-empty with concrete witness tuples.
- **Source book**: `references/05-wayne-logic.md`.

### S3 — Behavior Model

- Read `templates/stage-3-behavior-model.md` and follow it verbatim.
- Write `requires[]` (preconditions) for each parameter constraint. Write `ensures[]` (postconditions) split by outcome branch: one set for `success`, one set for each distinct error class. Reference `old(x)` / `x'` when asserting mutation. [B5 preconditions_postconditions, B5 change_assertions_old_new]
- For every entity the endpoint reads or writes, enumerate type/class invariants. Prefer MISU (Make Illegal States Unrepresentable) — flag parallel boolean flags that should be a single discriminated enum. [B5 type_and_class_invariants]
- Write frame conditions: fields that must NOT change across this operation. Any mutation outside the declared frame is a violation. [B5 change_assertions_old_new]
- Classify each collaborator the endpoint uses. Intra-system (same process) assertions are implementation details and must be ignored. Managed out-of-process (your DB) assertions must target final persisted state, not call counts. Unmanaged out-of-process (third-party HTTP, queue producer) assertions target the outbound message contract. [B3 observable_behavior_filter, B3 intra_vs_inter_system_rule, B3 mock_only_unmanaged_outbound]
- If the controller holds branching or arithmetic (not "humble"), surface a design note; S6 may still verdict COMPLIANT on behavior but record the anti-pattern. [B3 humble_controller_boundary]
- **STATIC branch**: emit `behavior-model.schema.json`-conforming JSON.
- **EXECUTABLE branch**: emit Zod schemas for inputs (`requires`) and outputs (`ensures`), plus a TS discriminated union for the outcome branches so S4 and S5 can exhaustively switch.
- **Inputs**: S1 output, S2 canonical predicates, optional `entity_dependency_map`.
- **Outputs**: `{ requires[], ensures_by_outcome{}, invariants[], frame_conditions[], collaborators[] }`.
- **Pass criteria**: every AC predicate maps to ≥ 1 requires/ensures. Every mutable entity has a frame clause. Every `ensures` references only observable-behavior fields (HTTP response, managed-dep persisted state, unmanaged-dep outbound message).
- **Source book**: `references/03-khorikov-observable-behavior.md`, `references/05-wayne-logic.md`.

### S4 — Test Enumeration

- Read `templates/stage-4-test-enumeration.md` and follow it verbatim.
- Apply Aniche's seven-step recipe in order: understand → explore → partition → boundaries → combine → automate → augment. Stop when pragmatic pruning is needed rather than exhausting the cartesian product. [B2 aniche_seven_step_spec_testing, B2 pragmatic_combination_pruning]
- For every input parameter emit equivalence partitions (null/empty/valid/invalid-by-length/invalid-by-format/boundary-low/boundary-high) and pick one representative per partition. Use realistic small values, never faker-generated randomness for key examples. [B2 equivalence_partitioning, B1 illustrate_with_key_examples]
- For every boundary emit an `on` point and an `off` point. For strict equality conditions emit one `on` and two `off` (one each side). [B2 boundary_value_analysis]
- For every cross-field rule build a category-partition table, mark "only once" exceptional partitions (null/empty), prune combinations that cannot vary behavior, and number the surviving combinations. [B2 category_partition_combination]
- For stateful endpoints partition by resource state before the call (empty/one item/many/frozen/deleted); script the setup sequence per state. [B2 state_aware_spec_testing]
- **STATIC branch**: emit the test case table JSON (`{ id, input, expected_outcome, technique, source_ac }`). Do not write code yet.
- **EXECUTABLE branch**: emit Vitest `it.each([...])` blocks driving `supertest(app.getHttpServer())` against a NestJS `Test.createTestingModule`. Name each test by business rule, not by class. Use a single seed input mutated per row. Use builders (aRequest().withX(...).build()) for fixtures. [B2 parameterized_same_seed, B2 specific_cohesive_fixture]
- **Inputs**: S3 requires/ensures + invariants.
- **Outputs**: `{ test_cases[], pruning_report }`.
- **Pass criteria**: every S3 predicate has ≥ 1 test case. Every boundary has on + off. No more than 2 exceptional-partition cases per field.
- **Source book**: `references/02-aniche-test-design.md`.

### S5 — Property Derivation

- Read `templates/stage-5-properties.md` and follow it verbatim.
- For each entity invariant from S3, emit a property: `∀ valid input, invariant(response.body)`. Combine many weak invariants rather than writing one implementation-equivalent property. [B4 invariant_properties]
- For each pair of inverse operations (POST then GET, POST then DELETE, encode then decode), emit a symmetric round-trip property. **Always pair it with an anchor invariant** (e.g. the intermediate value is non-empty / stored / returns the right status), else trivial identity implementations will pass. [B4 symmetric_roundtrip]
- When a simple reference model exists (e.g. an in-memory computation matching the endpoint's semantics), emit a model-based-oracle property comparing `real(x) === model(x)`. [B4 model_based_oracle]
- For stateful endpoints, emit an `fc.commands` + `fc.modelRun` property: deterministic initial state, symbolic commands with preconditions and postconditions, next_state function pure. [B4 stateful_command_testing, B4 state_machine_properties]
- Build generators with `fc.record` + `fc.oneof` + weighting so realistic inputs dominate. Prefer composable generators over `fc.filter` when the domain is sparse. Rely on default shrinking; only add explicit shrink controls when the default minimum isn't useful. [B4 custom_generator_composition, B4 shrinking_recenter_divide]
- **STATIC branch**: list the properties as structured objects (`{ name, kind, quantified_over, predicate, anchor }`).
- **EXECUTABLE branch**: emit TypeScript calling `fc.property` / `fc.assert` / `fc.asyncProperty`. Always include `{ seed, numRuns }` for reproducibility. Use `scripts/generate-fastcheck.ts` to template.
- **Inputs**: S3 behavior model, S4 test enumeration (for anchor examples).
- **Outputs**: `{ properties[] }`.
- **Pass criteria**: every entity invariant has ≥ 1 property. Every stateful endpoint has a state-machine property. Every round-trip has an anchor invariant. `parallel_stateful_testing` and `targeted_properties` are OPT-IN, not default. [B4]
- **Source book**: `references/04-hebert-properties.md`.

### S6 — Verdict

- Read `templates/stage-6-verdict.md` and follow it verbatim.
- For each `requires`/`ensures`/invariant/property, search the code for evidence the rule is enforced. Acceptable evidence: Zod/class-validator decorator, explicit `if` branch, NestJS `Pipe`/`Guard`/`Interceptor`, DB unique constraint matching an invariant. Record file:line. [B3 observable_behavior_filter]
- Classify each check:
  - **COMPLIANT**: evidence found AND it asserts on observable behavior (HTTP response, managed-dep persisted state, unmanaged-dep outbound call).
  - **VIOLATED**: contradicting code OR no enforcement for a must-have AC OR counterexample produced by S4/S5 in executable mode.
  - **UNDETERMINED**: the AC was flagged `abort:true` in S2 OR the relevant file is absent OR (executable mode) the test runner timed out / failed to compile.
- Any assertion about intra-system interactions (`jest.spyOn(service as any, 'internalHelper')`, asserting repository.save was called when the DB is managed) must be classified as VIOLATED of the observable-behavior rule, never as evidence of correctness. [B3 intra_vs_inter_system_rule, B3 no_private_method_tests]
- Any assertion that re-computes the expected value from the SUT's formula is VIOLATED — leaking domain knowledge. Expected values must be literals. [B3 no_domain_knowledge_leak]
- Any check that passes under pure refactoring but fails under a plausible rename is flagged brittle — record but do not flip verdict unless the refactor is in the diff. [B3 four_pillars_scoring, B3 end_result_redirection]
- **STATIC branch**: emit the final verdict JSON conforming to `schemas/verdict.schema.json`.
- **EXECUTABLE branch**: run `scripts/run-executable-mode.ts` on the generated tests; map per-test results to checks (green→COMPLIANT, red with counterexample→VIOLATED, timeout/skip→UNDETERMINED).
- **Inputs**: ALL stage outputs + the code files.
- **Outputs**: `{ summary, checks[], undetermined[], blocking_questions[] }` — the FINAL artifact.
- **Pass criteria**: every check has a status, ≥ 1 `technique_ids[]`, and ≥ 1 `source_books[]`. Every VIOLATED check has a counterexample. Every UNDETERMINED check has a reason.
- **Source books**: `references/03-khorikov-observable-behavior.md`, `references/01-adzic-key-examples.md`.

## 5. Mode selection

Default to STATIC. Escalate to EXECUTABLE when the input meets ANY of:

- The code change contains new business-logic branches S3 cannot fully model.
- The story involves arithmetic, dates, or time calculations (high off-by-one risk).
- The endpoint is stateful (a state machine was discovered in S3).
- The user explicitly asked to run the tests.
- The diff modifies a NestJS `Guard`, `Interceptor`, or `Pipe` whose semantics are hard to read statically.

Stay STATIC when:

- Code change < 20 lines and is purely a DTO rename/typo fix.
- The story has ≤ 2 ACs and no arithmetic.
- `executable` mode previously failed and no retry was requested.

On executable-mode failure, fall back to STATIC and mark affected checks UNDETERMINED with `reason: "executable_mode_failed"` plus the compiler/runner error.

## 6. Output contract

Final artifact conforms to `schemas/verdict.schema.json`. Top-level shape:

```json
{
  "summary": {
    "story_id": "string|null",
    "mode": "static|executable",
    "total_checks": 0,
    "compliant": 0,
    "violated": 0,
    "undetermined": 0
  },
  "checks": [
    {
      "id": "S3-requires-amount-positive",
      "stage": "S3",
      "technique_ids": ["preconditions_postconditions"],
      "source_books": ["B5"],
      "status": "COMPLIANT",
      "evidence": "src/orders/dto/create-order.dto.ts:14 — @IsPositive() on amount",
      "counterexample": null
    }
  ],
  "undetermined": [
    {
      "check_id": "S6-ensures-email-sent",
      "reason": "unmanaged_dependency_not_visible",
      "hint": "No mock/stub for SMTP client in provided files; cannot confirm outbound call without running executable mode."
    }
  ],
  "blocking_questions": [
    {
      "ac_id": "AC-3",
      "question": "When cancellation fails due to already-cancelled order, should the response be 409 Conflict (as the word 'conflict' suggests) or 400 Bad Request?",
      "candidates": ["status=409 body.code=ORDER_ALREADY_CANCELLED", "status=400 body.errors.state='already_cancelled'"]
    }
  ]
}
```

Example for a well-specified story: every check is COMPLIANT, `undetermined[]` and `blocking_questions[]` are empty. See `examples/01-happy-path/expected-verdict.json`.

Example for a vague story: S2 abort, every downstream check UNDETERMINED, `blocking_questions[]` enumerates concrete ambiguity witnesses. See `examples/02-ambiguous-story/expected-verdict.json`.

## 7. Failure modes

- **Story too vague** — S2 sets `abort:true`; emit a verdict where only S1 checks have definite status and everything from S3 onward is UNDETERMINED. `blocking_questions[]` must contain the specific witness from S2.
- **Code not provided** — run S1–S5 statically; emit a verdict where every check referencing code is UNDETERMINED with `reason: "code_not_available"`.
- **Schemas absent** — infer DTOs from controller types. If still absent, lower confidence and mark the affected S4 enumeration UNDETERMINED with `reason: "missing_schema_for_field_X"`.
- **Executable mode broken** — fall back to STATIC; mark S6 runtime-dependent checks UNDETERMINED with `reason: "executable_mode_failed"` plus the error excerpt.
- **Contradictory AC** — S2 emits a contradiction witness; S6 returns VIOLATED for the contradicting pair even before reading code.
- **Multi-story / multi-endpoint input** — fail loud with `reason: "multi_story_not_supported"`. The skill processes one story at a time.

Escape hatch: any stage may short-circuit by setting `abort:true` on its output. Downstream stages must still run and mark their checks UNDETERMINED instead of silently producing bogus assertions.

## 8. Non-goals

- Non-functional requirements: performance, latency, throughput, memory.
- Security: authn, authz, injection, secret handling, rate limiting.
- Architecture: layering, DI hygiene, module boundaries.
- Code style, formatting, linting, docstrings.
- Accessibility or UI semantics.
- Multi-turn interaction — the skill MUST complete in a single pass. Questions belong in `blocking_questions[]`, not in chat.

## 9. Book reference index

| ID | Author | Title | Used in stages | Reference file |
|----|--------|-------|----------------|----------------|
| B1 | Gojko Adzic | Specification by Example | S1, S6 | `references/01-adzic-key-examples.md` |
| B2 | Maurício Aniche | Effective Software Testing | S4 | `references/02-aniche-test-design.md` |
| B3 | Vladimir Khorikov | Unit Testing: Principles, Practices, and Patterns | S3, S6 | `references/03-khorikov-observable-behavior.md` |
| B4 | Fred Hebert | Property-Based Testing with PropEr, Erlang, and Elixir | S5 | `references/04-hebert-properties.md` |
| B5 | Hillel Wayne | Logic for Programmers | S2, S3 | `references/05-wayne-logic.md` |

Every technique cited in this file appears in its book's reference. Do not introduce techniques without a book citation.
