# Stage 6 — Verdict (prompt fragment)

**Input:** all prior stage outputs + the code files.

This is the FINAL stage. Its output IS the skill's output, conforming to `schemas/verdict.schema.json`.

**Do the following in order:**

1. **Enumerate all checks.** Collect every `requires`, `ensures`, invariant, frame_condition from S3; every test case from S4; every property from S5. Each becomes one candidate check with a unique id like `S3-requires-amount_positive`, `S4-T1`, `S5-P1`.

2. **Per check, find evidence.** [B3 observable_behavior_filter, B3 black_box_authoring] Search the provided code for enforcement. Acceptable evidence:
   - A Zod schema / class-validator decorator that encodes the predicate.
   - An explicit `if` / `throw` branch in the controller or service.
   - A NestJS `ValidationPipe`, `Guard`, `Interceptor`, or custom `Pipe` whose semantics match.
   - A DB unique/NOT NULL/CHECK constraint matching an invariant.
   - (executable mode) A green test run for that check.
   Record `evidence: "<file>:<line>"` for each found.

3. **Classify per check:**
   - **COMPLIANT** if evidence is found AND the enforcement operates on observable behavior.
   - **VIOLATED** if the code contradicts the predicate OR a must-have AC has no enforcement OR (executable mode) the test produced a counterexample.
   - **UNDETERMINED** if S2 flagged the source AC as ambiguous/contradictory OR the relevant file is absent OR (executable mode) the runner timed out / failed to compile.

4. **Apply B3 anti-pattern rules:**
   - Assertion on `(service as any).privateHelper()` → VIOLATED (tests implementation detail). [B3 no_private_method_tests]
   - Assertion on repository `save`/`findOne` call count while the DB is classified managed → VIOLATED. [B3 intra_vs_inter_system_rule, B3 mock_only_unmanaged_outbound]
   - Test recomputes expected value via the SUT's formula → VIOLATED (domain knowledge leak). [B3 no_domain_knowledge_leak]
   - Static `Date.now()` / `new Date()` inside SUT with a time-sensitive AC → VIOLATED of `time_injection_required`. [B3 explicit_time_dependency]
   - Controller contains branching/arithmetic AND an S3 `humble_controller_violation` was set → record `design_note` but verdict based on behavior, not structure.

5. **Apply B5 contract-change rule.** [B5 weaken_precond_strengthen_postcond] If the diff tightens a precondition or weakens a postcondition versus the existing API — flag as VIOLATED of the substitution rule even when the new behavior matches the new AC (existing callers break).

6. **Counterexamples.** For each VIOLATED check, attach a concrete counterexample:
   - STATIC mode: the tuple of input/state that contradicts the predicate, extracted from the code path or decision-table cell.
   - EXECUTABLE mode: the shrunk fast-check counterexample or the failing `it.each` row label + input. [B4 shrinking_recenter_divide]

7. **Summary.** Count COMPLIANT / VIOLATED / UNDETERMINED. Record `mode` used (static or executable). Carry over `blocking_questions[]` from S2.

**Executable-mode post-processing:**

Run `scripts/run-executable-mode.ts` on the generated test files. Map results:
- green → COMPLIANT
- red with counterexample → VIOLATED with that counterexample
- timeout/skip/compile-failure → UNDETERMINED with `reason: "executable_mode_failed"` + compiler/runner excerpt

**Output JSON (exact shape, conforms to `schemas/verdict.schema.json`):**

```json
{
  "summary": {
    "story_id": null,
    "mode": "static",
    "total_checks": 12,
    "compliant": 10,
    "violated": 0,
    "undetermined": 2
  },
  "checks": [
    {
      "id": "S3-requires-amount_positive",
      "stage": "S3",
      "technique_ids": ["preconditions_postconditions", "observable_behavior_filter"],
      "source_books": ["B5", "B3"],
      "status": "COMPLIANT",
      "evidence": "src/orders/dto/create-order.dto.ts:14 — @IsPositive() on amount",
      "counterexample": null
    },
    {
      "id": "S3-ensures-success-status_201",
      "stage": "S3",
      "technique_ids": ["preconditions_postconditions"],
      "source_books": ["B5"],
      "status": "COMPLIANT",
      "evidence": "src/orders/orders.controller.ts:22 — @HttpCode(201)",
      "counterexample": null
    }
  ],
  "undetermined": [
    {
      "check_id": "S4-T8",
      "reason": "missing_schema_for_field_currency",
      "hint": "No @IsIn(['USD','EUR',…]) decorator on currency; cannot determine validation behavior statically."
    }
  ],
  "blocking_questions": []
}
```

**Pass criteria:**
- Every check has a status, ≥ 1 `technique_ids`, ≥ 1 `source_books`.
- Every VIOLATED check has a `counterexample`.
- Every UNDETERMINED check has a `reason`.
- `summary.compliant + violated + undetermined == total_checks`.

**Do NOT:**
- Mark COMPLIANT based on presence of a test that asserts on internals — that's implementation-detail coupling.
- Invent techniques without a book citation in `technique_ids[]` and `source_books[]`.
- Silently drop a `blocking_question` from S2 — it must survive to the final output.
- Issue follow-up questions to the user; the skill is single-pass.
