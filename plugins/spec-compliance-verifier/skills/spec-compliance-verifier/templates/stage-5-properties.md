# Stage 5 — Property Derivation (prompt fragment)

**Input:** S3 behavior model + S4 test enumeration.

Properties generalize beyond the concrete examples of S4. They are the difference between "this example works" and "every input satisfies X". [B4]

**Do the following in order:**

1. **Invariant properties.** [B4 invariant_properties] For each entity invariant from S3, emit a property stating the invariant holds for EVERY valid input:
   ```
   ∀ valid input, response.status in {2xx, 4xx} && invariantHolds(response.body, db.state)
   ```
   One property per invariant — do NOT bundle many into one. Small weak invariants > one large fuzzy one.

2. **Round-trip properties.** [B4 symmetric_roundtrip] For every pair of inverse operations discovered in S1/S3 (POST then GET, POST then DELETE, encode then decode, create then read), emit a symmetric property. ALWAYS pair with an anchor invariant on the intermediate result, else a trivial identity implementation will pass:
   ```
   ∀ payload p,
     let created = POST(p);            // anchor: created.id is UUID, created.amount == p.amount
     let fetched = GET(created.id);
     fetched.amount == p.amount && fetched.id == created.id && fetched.status == 'PENDING'
   ```

3. **Model-based oracle.** [B4 model_based_oracle] If an obviously-correct in-memory implementation of the endpoint's logic is feasible (≤ 30 LOC), emit a property comparing the real endpoint to the model:
   ```
   ∀ input x, realApi(x) equals modelFn(x)   // on status + body shape
   ```
   Keep the model free of the SUT's optimizations so mistakes aren't mirrored.

4. **Stateful command properties.** [B4 stateful_command_testing] For stateful endpoints (a state machine was discovered in S3), emit a command-based property:
   - initial state: deterministic
   - commands: one per allowed operation, each with precondition (on model state), generator for args, postcondition (on real response)
   - next_state: pure function (model_state, command, result) → new_model_state

5. **State-machine properties.** [B4 state_machine_properties] When the S3 invariants include an `enum_exhaustive` with named states AND transitions between them:
   - enumerate the allowed transitions per state
   - each command is only generated when precondition on current named state holds
   - postcondition: real system's observable state matches the modeled target state after the command

6. **Custom generator composition.** [B4 custom_generator_composition] Build generators that reflect the DTO shape + constraints:
   ```ts
   const amountArb = fc.float({min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true});
   const currencyArb = fc.constantFrom('USD', 'EUR', 'GBP', 'UAH');
   const validBodyArb = fc.record({ amount: amountArb, currency: currencyArb });
   const invalidAmountArb = fc.oneof(
     fc.constant(0),
     fc.float({max: 0, noNaN: true}),
     fc.constant(null as any),
   );
   ```
   Prefer `fc.record`/`fc.tuple`/`fc.oneof` over `fc.filter` when the domain is sparse.

7. **Shrinking control.** [B4 shrinking_recenter_divide] Rely on default shrinking. Only add `.noShrink()` when preserving the original input is required. Always use the SHRUNK counterexample, never the first-seen failure.

8. **OPT-IN advanced.** `parallel_stateful_testing` [B4] and `targeted_properties` [B4] are OPT-IN. Emit them only when the user story explicitly mentions concurrency / stress / adversarial load.

**Executable branch (when mode=executable):**

Use `scripts/generate-fastcheck.ts` (in the plugin) as a template emitter. Always include `{ seed, numRuns }` for reproducibility:

```ts
import fc from 'fast-check';
import request from 'supertest';

it('invariant: every accepted order has status PENDING', async () => {
  await fc.assert(
    fc.asyncProperty(validBodyArb, async (body) => {
      const res = await request(app.getHttpServer()).post('/orders').send(body);
      if (res.status !== 201) return res.status === 400;  // anchor
      return res.body.status === 'PENDING' && typeof res.body.id === 'string';
    }),
    { seed: 42, numRuns: 200 }
  );
});
```

For stateful:

```ts
type ModelState = { orders: Map<string, {status: 'PENDING'|'PAID'|'CANCELLED'}> };
class CreateOrderCommand implements fc.AsyncCommand<ModelState, RealSystem> {
  constructor(readonly body: {amount: number; currency: string}) {}
  check(m: ModelState) { return true; }
  async run(m: ModelState, r: RealSystem) {
    const res = await r.post('/orders', this.body);
    expect(res.status).toBe(201);
    m.orders.set(res.body.id, { status: 'PENDING' });
  }
  toString() { return `POST /orders ${JSON.stringify(this.body)}`; }
}
```

**Output JSON (exact shape):**

```json
{
  "stage": "S5",
  "properties": [
    {
      "id": "P1",
      "kind": "invariant",
      "name": "created_order_has_pending_status",
      "quantified_over": "valid_body",
      "predicate": "POST /orders returns 201 => body.status == 'PENDING'",
      "anchor": "body.id is UUID",
      "source_invariant_id": "Order.status_enum",
      "technique": "invariant_properties"
    },
    {
      "id": "P2",
      "kind": "round_trip",
      "name": "create_then_get_returns_same_order",
      "anchor": "created.id is UUID and created.amount == input.amount",
      "technique": "symmetric_roundtrip"
    }
  ],
  "opt_in_used": []
}
```

**Pass criteria:**
- Every entity invariant from S3 has ≥ 1 property.
- Every stateful endpoint has a state-machine or command-based property.
- Every round-trip property has an anchor.
- `parallel_stateful_testing` and `targeted_properties` appear in `opt_in_used[]` only when the story demanded them.

**Do NOT:** write a property body that is a copy of the implementation; omit anchor invariants; use `fc.filter` on sparse domains; trust the first failing counterexample (use the shrunk one).
