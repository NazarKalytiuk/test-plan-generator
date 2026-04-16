# Stage 3 — Behavior Model (prompt fragment)

**Input:** S1 output + S2 canonical predicates; optional `entity_dependency_map`.

If S2 set `abort: true`, still run S3 for the ACs that were NOT flagged — produce a partial model and set `partial: true` on the output.

**Do the following in order:**

1. **Enumerate `requires[]` per operation.** [B5] One entry per input constraint from S2 canonical predicates. Each entry has `{name, predicate, source_ac_id}`. Example: `{"name": "amount_positive", "predicate": "amount > 0", "source_ac_id": "AC-1"}`.

2. **Enumerate `ensures_by_outcome{}`.** [B5, B3] For each outcome branch (success + each distinct error class), write predicates referencing only **observable behavior**: HTTP status, response body fields, response headers, managed-dep persisted state, unmanaged-dep outbound call. Split by outcome:
   ```json
   {
     "success": [
       {"name": "status_201", "predicate": "response.status == 201"},
       {"name": "body_has_id", "predicate": "response.body.id is UUID"},
       {"name": "persisted_pending", "predicate": "db.orders.byId(response.body.id).status == 'PENDING'"}
     ],
     "validation_error": [
       {"name": "status_400", "predicate": "response.status == 400"},
       {"name": "errors_field", "predicate": "response.body.errors exists"}
     ]
   }
   ```

3. **Write invariants on entities.** [B5 type_and_class_invariants] For each entity the endpoint touches, list invariants the entity must always satisfy. Prefer MISU: if the AC has two mutually exclusive booleans, flag them and recommend a single enum. Example: `{"entity": "Order", "invariant": "status in {PENDING, PAID, CANCELLED}", "kind": "enum_exhaustive"}`.

4. **Write frame conditions.** [B5 change_assertions_old_new] For each mutable entity, list fields that must NOT change across this operation. Example: `{"entity": "Order", "field": "createdAt", "must_change": false}`. If `old(x)` is needed, state it: `{"entity": "Order", "field": "updatedAt", "relation": "updatedAt > old(updatedAt)"}`.

5. **Classify collaborators.** [B3 intra_vs_inter_system_rule] For each collaborator the endpoint uses, assign one of:
   - `intra_system`: same process (other NestJS providers). Assertions on their internal calls are implementation details — IGNORE.
   - `managed_out_of_process`: your DB / cache. Assert final persisted state.
   - `unmanaged_out_of_process`: third-party HTTP, queue producer. Assert outbound call contract.
   If `entity_dependency_map` was provided, use it. Otherwise: `*Repository` / TypeORM / Prisma / Mongoose → `managed`; any HTTP client / SQS / Kafka / SMTP / external SDK → `unmanaged`; everything else → `intra_system`.

6. **Humble controller check.** [B3] If the parsed controller has branching/arithmetic itself (not pushed into a service or domain object), set `humble_controller_violation: true` on the output — S6 records this as a design note, not a VIOLATED check (unless the behavior itself is wrong).

7. **Refinement check for ambient/time-sensitive AC.** [B5 refinement_check, B3 explicit_time_dependency] If any AC references "now", "today", or time comparison, require the model to include `clock` as an injected dependency. Flag `time_injection_required: true`.

**Executable branch (when mode=executable):**

Emit:
- `schemas/inferred-input.schema.ts` as Zod: `z.object({amount: z.number().positive(), currency: z.string().regex(/^[A-Z]{3}$/)})`.
- `schemas/inferred-output.schema.ts` as a Zod discriminated union keyed on outcome.
- A TS discriminated union for outcome branches so S4 and S5 can exhaustively switch.

**Output JSON (exact shape):**

```json
{
  "stage": "S3",
  "partial": false,
  "requires": [
    {"name": "amount_positive", "predicate": "input.body.amount > 0", "source_ac_id": "AC-1"}
  ],
  "ensures_by_outcome": {
    "success": [{"name": "status_201", "predicate": "response.status == 201", "source_ac_id": "AC-1"}],
    "validation_error": [{"name": "status_400", "predicate": "response.status == 400", "source_ac_id": "AC-2"}]
  },
  "invariants": [
    {"entity": "Order", "invariant": "status in {PENDING, PAID, CANCELLED}", "kind": "enum_exhaustive"}
  ],
  "frame_conditions": [
    {"entity": "Order", "field": "createdAt", "must_change": false}
  ],
  "collaborators": [
    {"name": "OrdersRepository", "classification": "managed_out_of_process", "reason": "TypeORM repository for your DB"},
    {"name": "EmailQueueClient", "classification": "unmanaged_out_of_process", "reason": "SQS producer observed by other apps"},
    {"name": "PricingService", "classification": "intra_system", "reason": "NestJS provider in same process"}
  ],
  "humble_controller_violation": false,
  "time_injection_required": false
}
```

**Pass criteria:**
- Every S2 canonical predicate maps to ≥ 1 `requires` OR `ensures` entry.
- Every mutable entity has at least one frame condition.
- Every `ensures` references only observable-behavior fields (HTTP response OR managed-dep persisted state OR unmanaged-dep outbound call).
- Every collaborator has a classification.

**Do NOT:** put intra-system call counts in `ensures`; assert on a repository method being called when the DB is managed; classify a third-party HTTP client as intra-system.
