# Stage 4 — Test Enumeration (prompt fragment)

**Input:** S3 behavior model (requires, ensures_by_outcome, invariants, frame_conditions).

**Do the following in order:** (Aniche's seven-step recipe, [B2])

1. **Understand.** Re-read S1 inputs/outputs and S3 requires/ensures. Note any cross-field dependencies.

2. **Explore.** Pick 3 concrete sample inputs and mentally simulate expected behavior. If simulation reveals a case not in S1 key_examples, add it. [B2 aniche_seven_step_spec_testing]

3. **Partition each parameter.** [B2 equivalence_partitioning] For every input, list partitions:
   - If the constraint is numeric: `null`, `undefined` (if optional), `below_min`, `at_min`, `in_range`, `at_max`, `above_max`, `non_numeric_string`.
   - If the constraint is string-format: `null`, `empty`, `too_short`, `valid`, `too_long`, `invalid_format`.
   - If the constraint is enum: one representative per enum value, plus `unknown_value`.
   - If the constraint is cross-field: partition each field independently, then handle combinations in step 5.
   Record `{parameter, partition, representative_value, expected_outcome}` for each.

4. **Boundaries.** [B2 boundary_value_analysis] For every partition pair, emit an on-point and an off-point. For equality conditions (`==`), emit one on-point and two off-points (one each side).

5. **Combine.** [B2 category_partition_combination] For multi-field rules, build a category-partition table. Annotate "only-once" partitions (null/empty/undefined). Compute the cartesian product of remaining partitions. Drop combinations that cannot vary behavior (spec-derived, not guessed). Number survivors `T1..Tn`.

6. **Prune pragmatically.** [B2 pragmatic_combination_pruning] If `|survivors| > 50`, split the endpoint mentally: would a `POST /orders` with 10 fields be better split into `POST /orders` + `POST /orders/:id/items`? Record a design note; still emit tests against the endpoint as-is.

7. **State-aware partitioning.** [B2 state_aware_spec_testing] If the endpoint is stateful (reads or mutates a long-lived resource), add a `state_partitions[]` dimension: `{state: 'empty'|'one'|'many'|'frozen'|'deleted', setup_steps: [...]}`. Combine state × input only where behavior differs.

8. **Augment.** Add cases from experience that steps 1–7 missed (e.g. Unicode, surrogate pairs, very large numbers, concurrent modification).

**Executable branch (when mode=executable):**

Emit Vitest/Jest `it.each` tables driving `supertest`. One `describe` block per business rule (not per class). Use a single seed input mutated per row. [B2 parameterized_same_seed]

```ts
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import request from 'supertest';

describe('POST /orders — amount validation', () => {
  let app: import('@nestjs/common').INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  const seed = { amount: 100, currency: 'USD' };

  it.each([
    ['amount_positive', { ...seed, amount: 0.01 }, 201],
    ['amount_zero_off_point', { ...seed, amount: 0 }, 400],
    ['amount_negative_off_point', { ...seed, amount: -0.01 }, 400],
    ['amount_null', { ...seed, amount: null }, 400],
  ])('%s', async (_label, body, expectedStatus) => {
    const res = await request(app.getHttpServer()).post('/orders').send(body);
    expect(res.status).toBe(expectedStatus);
  });
});
```

Use **builders** for fixtures (aRequest().with...().build()) to keep each test showing only the fields relevant to its partition. [B2 specific_cohesive_fixture]

Use **real managed dependencies** via testcontainers for DB; mock unmanaged dependencies (SQS, SMTP, third-party HTTP) with `nock` or explicit mocks. Do NOT mock intra-system providers. [B3 intra_vs_inter_system_rule]

Assert on `response.status`, `response.body`, `response.headers`, and (for mutations) on the managed-dep final state via a direct DB re-query. Do NOT assert on internal service calls, private helpers, or repository method invocations. [B3 observable_behavior_filter, B3 no_private_method_tests]

**Output JSON (exact shape):**

```json
{
  "stage": "S4",
  "test_cases": [
    {
      "id": "T1",
      "describe": "POST /orders — amount validation",
      "name": "amount_zero_off_point",
      "input": {"body": {"amount": 0, "currency": "USD"}},
      "state_pre": null,
      "expected_outcome": "validation_error",
      "expected_assertions": [
        {"target": "response.status", "predicate": "== 400"},
        {"target": "response.body.errors.amount", "predicate": "defined"}
      ],
      "technique": "boundary_value_analysis",
      "source_ac_id": "AC-1"
    }
  ],
  "pruning_report": {
    "nominal_cartesian_size": 48,
    "effective_test_count": 14,
    "dropped_reasons": ["null/undefined combined: exceptional, kept once each", "currency cross-combined with every amount: dropped; amount drives branch"]
  }
}
```

**Pass criteria:**
- Every S3 predicate has ≥ 1 test case.
- Every boundary has on-point + off-point (+ two-off-points for equality conditions).
- No more than 2 exceptional-partition cases (null/empty/undefined) per field.
- Every test case names its `technique` and `source_ac_id`.

**Do NOT:** combine every exceptional value with every other partition; assert on internal service method calls; use faker-generated randomness for key examples (use concrete values).
