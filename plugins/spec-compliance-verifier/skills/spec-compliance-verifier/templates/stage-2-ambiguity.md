# Stage 2 — Ambiguity Detection (prompt fragment)

**Input:** S1 output (parsed story).

**Do the following in order:**

1. **Split each AC into atomic propositions.** [B5] Example: AC "admin users can delete any order, but customers can only delete their own pending orders" → `isAdmin(u)`, `isOwner(u, o)`, `status(o) == 'PENDING'`. Name each atomic proposition; reuse names across ACs where meaning matches.

2. **Combine explicitly.** [B5] Rewrite each AC's English logic as a Boolean expression over the atomic propositions. Make operator precedence explicit with parentheses. Example: "A and B or C" → `(A && B) || C` OR `A && (B || C)` — document BOTH candidates.

3. **Detect precedence ambiguity.** [B5] For each AC, if 2+ parenthesizations are plausibly consistent with the English, emit a `blocking_question`:
   ```json
   {
     "ac_id": "AC-3",
     "kind": "operator_precedence_ambiguity",
     "question": "Should 'admin OR owner AND pending' be '(admin OR owner) AND pending' (restrictive) or 'admin OR (owner AND pending)' (permissive)?",
     "candidates": [
       {"formula": "(isAdmin || isOwner) && pending", "implies": "admin cannot delete non-pending orders"},
       {"formula": "isAdmin || (isOwner && pending)", "implies": "admin can delete any order; owner only pending"}
     ]
   }
   ```

4. **Build decision table if ≤ 5 finite inputs.** [B5] For every combination of the finite inputs, add a row. Count effective rows (each `any/-` = N expansions, each `/` impossible = 0).
   - If effective rows **<** product-of-value-counts → **incomplete**. Emit a `blocking_question` listing specific missing tuples.
   - If effective rows **>** product-of-value-counts → **unsound**. Emit a `blocking_question` listing the contradictory tuple and the two conflicting rows.
   - **Never** place `any` to the left of a fixed value; if the input AC does, rewrite it as explicit rows.

5. **Check conjunction satisfiability.** [B5] Treat `P1 && P2 && ... && Pn` where `Pi` is the canonical predicate of `AC-i`. Try small enumeration over finite inputs; if any Pi contradicts another Pj on every model, the story is **contradictory**. Emit a `blocking_question` naming the pair and the unsat witness.

6. **Set the abort flag.** If ≥ 1 must-have AC is ambiguous or contradictory, set `abort: true`. S6 will mark every downstream check UNDETERMINED and surface the `blocking_questions[]` to the caller.

**Executable branch (optional, when mode=executable):**

Generate a fast-check harness that asserts all AC predicates simultaneously against a uniform generator covering the finite domain. A shrunk failing case IS the contradiction witness. [B5 contradiction_detection_via_unsat]

```ts
import fc from 'fast-check';
fc.assert(
  fc.property(inputArb, (input) => {
    const p1 = AC1(input), p2 = AC2(input), p3 = AC3(input);
    return !(p1 && p2 && p3) || expectedOutcomeConsistent(input);
  }),
  { seed: 42, numRuns: 1000 }
);
```

For decision tables, emit an exhaustive TS switch over the discriminated-union input so the compiler flags missing cases:

```ts
type Decision = {role: 'admin'|'customer', status: 'PENDING'|'PAID'|'CANCELLED'};
function decide(d: Decision): 'allow'|'deny' {
  switch (`${d.role}/${d.status}`) {
    case 'admin/PENDING': return 'allow';
    // ...every case explicit; no default
  }
}
```

**Output JSON (exact shape):**

```json
{
  "stage": "S2",
  "predicates": [
    {"ac_id": "AC-1", "canonical": "isAuthenticated(u) && amount > 0 && validCurrency(c)", "atomic": ["isAuthenticated", "amount_positive", "validCurrency"]}
  ],
  "decision_table": {
    "inputs": ["role", "status"],
    "rows": [
      {"role": "admin", "status": "PENDING", "output": "allow"}
    ],
    "expected_rows": 6,
    "effective_rows": 6,
    "soundness": "sound",
    "completeness": "complete"
  },
  "blocking_questions": [],
  "abort": false
}
```

**Pass criteria:**
- If `abort == false`: every AC has a canonical predicate, and the decision table (if any) is both sound and complete.
- If `abort == true`: `blocking_questions[]` is non-empty and each entry names the AC, the kind of ambiguity, and a concrete witness tuple.

**Do NOT:** silently pick one parenthesization when two are plausible; hide a `/` cell to make an unsound table look complete; proceed past S2 when `abort: true`.
