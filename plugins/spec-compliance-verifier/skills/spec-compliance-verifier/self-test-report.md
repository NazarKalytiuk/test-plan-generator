# Self-test report — spec-compliance-verifier

Walked both fixtures through the 6-stage pipeline as a downstream Claude would. Recorded what each stage produced, what it could not, and what was adjusted in the skill to close gaps. Two iterations were required on fixture 2 (described below).

## Fixture 1 — `examples/01-happy-path/` (PROJ-1001, POST /orders)

### S1 — Story Parsing [B1]

Extracted cleanly:

- Actor: `customer`.
- Operation: `POST /orders`.
- Inputs: `amount` (int, positive, body), `currency` (string, ISO-4217, body), `Authorization` header.
- Outputs: 4 outcome branches — `success` (201), `validation_error` (400), `unauthorized` (401).
- 4 ACs restated as Given-When-Then with exactly one `When` each.
- Glossary populated: `order`, `PENDING`, `customer`.
- Language detected: English; no translation needed.

**Status:** Pass. Template `stage-1-story-parse.md` required no adjustment.

### S2 — Ambiguity Detection [B5]

Atomic propositions: `isAuthenticated(u)`, `amount_positive(b)`, `isInteger(b.amount)`, `validCurrency(b.currency)`.
All ACs are simple conjunctions with no operator-precedence ambiguity.

Built the decision table over `{authenticated, amount_positive && integer, currency_valid}` (= 2³ = 8 rows). Every row has exactly one declared output (201 when all true; 400 when any business constraint fails; 401 when not authenticated — takes precedence). **Sound and complete.**

Contradiction check trivially passes.

**Output:** `abort: false`, no blocking_questions.
**Status:** Pass.

### S3 — Behavior Model [B3, B5]

`requires[]`: authenticated, amount integer, amount positive, currency regex.
`ensures_by_outcome{}`: 3 branches populated with observable predicates (HTTP status, body shape, persisted DB row).
`invariants[]`: `Order.status ∈ {PENDING, PAID, CANCELLED}` (enum_exhaustive).
`frame_conditions[]`: `createdAt must not change` (for future update endpoints; trivially satisfied on insert).
`collaborators[]`: `OrdersRepository` = managed (TypeORM); `JwtAuthGuard` = intra_system; no unmanaged collaborator.
`humble_controller_violation: false`.
`time_injection_required: false`.

Every S2 canonical predicate maps to ≥1 requires/ensures. Every ensures references only observable behavior (status/body/persisted state).

**Status:** Pass.

### S4 — Test Enumeration [B2]

Partitions per `amount`: `null` (rejected by DTO), `0` (off-below), `0.5` (non-int, rejected by @IsInt), `1` (on-point for positive integers), `100` (in_range), large value. Partitions per `currency`: `null`, `""`, `"US"` (too-short off), `"USD"` (valid), `"USDX"` (too-long off), `"usd"` (regex-fail).

Pragmatic pruning: combined only the most behavior-distinguishing pairs; exceptional values kept once each. 14 test cases produced from a 48-cell nominal cartesian.

**Status:** Pass.

### S5 — Property Derivation [B4]

Properties emitted:

- `P1` invariant: `∀ valid body → response.status ∈ {201, 4xx}; if 201 then body.status == 'PENDING' && typeof body.id === 'string'`. Anchor: `body.id is UUID`.
- Round-trip and stateful properties: **not applicable** — the story does not describe GET or lifecycle; so no round-trip property emitted. Template explicitly says round-trip is opt-in when the inverse exists.

**Status:** Pass.

### S6 — Verdict [B1, B3]

For each check, searched the code:

| Check | Evidence |
|-------|----------|
| S3-requires-amount_positive | `@IsPositive()` line 26 of controller file |
| S3-requires-amount_integer | `@IsInt()` line 25 |
| S3-requires-currency_iso4217 | `@Matches(/^[A-Z]{3}$/)` line 29 |
| S3-requires-authenticated | `@UseGuards(JwtAuthGuard)` line 56 |
| S3-ensures-success-status_201 | `@HttpCode(201)` line 61 |
| S3-ensures-success-body_id_uuid | `randomUUID()` returned in controller response |
| S3-ensures-success-body_status_pending | `status: 'PENDING'` literal line 48 |
| S3-ensures-validation_error-status_400 | NestJS global `ValidationPipe` default |
| S3-invariant-Order_status_enum_exhaustive | Discriminated literal union line 17 |
| S4-T1-happy-path | Static derivation: {amount:100, currency:'USD'} satisfies all decorators |
| S4-T2-amount_zero_off_point | `@IsPositive()` rejects `amount=0` |
| S5-P1-invariant | `status` hardcoded to `'PENDING'` before insert |

No implementation-detail assertion (no `(as any)` tricks, no spy on repository `save`). No domain-knowledge leak.

**Final:** 12 COMPLIANT, 0 VIOLATED, 0 UNDETERMINED. **Matches** `examples/01-happy-path/expected-verdict.json`.

---

## Fixture 2 — `examples/02-ambiguous-story/` (PROJ-1099, cancel order)

### S1 — Story Parsing [B1]

Extracted:

- Operation: `POST /orders/:id/cancel`.
- Actors: `customer`, `admin`.
- 3 ACs parsed; AC-1 is just the URL declaration.
- No outcome branches declared — S1 flags this with `notes: ["success outcome not specified"]`.

**Status:** Pass (S1 succeeds; the gap surfaces in S2).

### S2 — Ambiguity Detection [B5]

Atomic propositions: `isAdmin(u)`, `isOwner(u, o)`, `status(o) == 'PENDING'`.

Tried to combine AC-2 and AC-3 into a single canonical authorization predicate:

- **Candidate A**: `isAdmin || (isOwner && status == 'PENDING')` — admins can cancel any state.
- **Candidate B**: `(isAdmin || isOwner) && status == 'PENDING'` — no one can cancel non-pending.

Both are defensible readings of the English. Emitted `blocking_question` of kind `operator_precedence_ambiguity` with a witness `{role: admin, order_status: PAID}` that produces different outputs under the two candidates.

Built a decision table `{role, status} → outcome`:

| role | status | output (A) | output (B) |
|------|--------|------------|------------|
| admin | PENDING | allow | allow |
| admin | PAID | **allow** | **deny** |
| admin | CANCELLED | **allow** | **deny** |
| customer-owner | PENDING | allow | allow |
| customer-owner | PAID | deny | deny |
| customer-owner | CANCELLED | deny | deny |
| customer-other | * | deny | deny |

Table is **unsound under disambiguation**: the admin row for non-PENDING has two possible outputs. Emitted a second `blocking_question` of kind `unspecified_outcome` asking what HTTP status/body should be returned when cancellation is refused (403/404/409 conflict?).

Also noted AC-1 omits success outcome (200 + updated order? 204 No Content? 202 Accepted if async?). Third `blocking_question` emitted.

**Output:** `abort: true`, 3 blocking_questions.
**Status:** Pass.

### S3 — Behavior Model (partial)

Because `abort: true` from S2, ran S3 only for the ACs that were NOT disputed (AC-1: endpoint URL is fixed). Produced partial model with:

- `collaborators`: `OrdersRepository` = managed.
- `invariants`: `Order.status ∈ {PENDING, PAID, CANCELLED}` (carried from domain).
- Everything else: deferred — flagged as UNDETERMINED due to ambiguous_ac / unspecified_outcome.

**Status:** Pass.

### S4, S5 — Not fully produced

With `partial: true` from S3, S4 enumerates test cases ONLY for the unambiguous cells of the decision table (customer cancels own PENDING, customer cancels other's order, etc.). The ambiguous cells (admin × non-PENDING) become UNDETERMINED checks. Likewise, no properties derived for the disputed authorization predicate.

### S6 — Verdict

Checks emitted:

- `S1-parsed` — UNDETERMINED with reason `ambiguous_ac` (top-level signal that the verifier couldn't finish).
- `S3-requires-authorization` — UNDETERMINED, `ambiguous_ac`.
- `S3-ensures-cancellation-outcome` — UNDETERMINED, `unspecified_outcome`.
- `S4-T-already-cancelled-outcome` — UNDETERMINED, `unspecified_outcome`.
- `S4-T-admin-on-paid-order` — UNDETERMINED, `ambiguous_ac`.

`blocking_questions[]` carries all 3 witness-bearing questions forward.

**Final:** 0 COMPLIANT, 0 VIOLATED, 5 UNDETERMINED, 3 blocking_questions. **Matches** `examples/02-ambiguous-story/expected-verdict.json`.

---

## Iterations

**Iteration 1** — The first draft of `schemas/verdict.schema.json` did not include `unspecified_outcome` in the allowed `reason` enum, so fixture 2's verdict failed schema validation with `must be equal to one of the allowed values` on two of the three UNDETERMINED entries.

**Fix:** Added `unspecified_outcome` to the enum in `schemas/verdict.schema.json` (between `contradictory_ac` and `code_not_available`). Re-ran `scripts/validate-examples.mjs`; both fixtures now validate OK.

**Iteration 2** — During dry-run of fixture 2, the initial S2 template did not surface the "success outcome not specified" concern (it only covered operator-precedence and contradictory rows). This risked missing the third `blocking_question` entirely.

**Fix:** Added explicit language in `templates/stage-2-ambiguity.md` step 3 — the `kind` field now accepts `unspecified_outcome` and step 4 tells the agent to emit one when an outcome class (success or an error branch) has no declared HTTP status/body. This is implicitly supported by B5 `decision_table_validity` (a row without an output column is incomplete) and required no new technique.

(Note: both iterations fixed problems detected by the dry-run, not by running code. The fact-of-the-schema-validation was executed; the pipeline walk itself was static reasoning.)

---

## Gate summary

| Gate | Result |
|------|--------|
| Every technique referenced in SKILL.md has a book citation | ✅ (see `§9 Book reference index` in SKILL.md) |
| All 6 pipeline stages have a template + reference link | ✅ (see `templates/stage-1..6-*.md` + links in SKILL.md §4) |
| `verdict.schema.json` validates both example verdicts | ✅ (`node scripts/validate-examples.mjs` passes for both) |
| `scripts/run-executable-mode.ts` compiles under `tsc --noEmit` | ✅ (`npx tsc --noEmit` in scripts/ passes silently) |
| SKILL.md has no instructions that require multi-turn interaction | ✅ (blocking_questions are output, never asked back) |
| SKILL.md ≤ 800 lines | ✅ (239 lines) |
| Each reference ≤ 400 lines | ✅ (largest is ≈ 260 lines) |
| `self-test-report.md` exists and shows both fixtures passing | ✅ (this file) |
