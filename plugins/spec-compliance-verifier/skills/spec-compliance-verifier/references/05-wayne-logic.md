# B5 — Wayne, *Logic for Programmers* (2025)

Source for stages **S2 (Ambiguity Detection)** and **S3 (Behavior Model)**.

## Techniques

### `preconditions_postconditions` [S3]

State what a function requires of callers and ensures about results.

**Procedure:**
1. For each AC, identify the operation and its inputs.
2. Write `requires:` predicates for every assumption about inputs and starting state.
3. Write `ensures:` predicates describing the output and state change.
4. Encode `requires` as asserts at function entry; `ensures` at exit.
5. Each caller either guarantees callee's `requires` or carries it as its own new `requires`.
6. Flag any AC where `requires` cannot be phrased without "it depends" — that is under-specification.

**Counterexample shape:** Assertion fails at entry (caller broke contract) or exit (implementation wrong); or a precondition cannot be stated.
**NestJS/TS mapping:** Zod `.refine()` or `parse()` at entry = requires; asserts on return value or a Zod output schema = ensures. `class-validator` `@IsDefined`/custom validators express preconditions on DTOs.
**Book anchor:** Functional Correctness, Assertions + Contracts.

### `type_and_class_invariants` [S3]

Properties that must hold for every value of a type across its lifetime.

**Procedure:**
1. List every field of the entity from the AC.
2. For each combination, ask "can this combination ever be legal?"
3. Write impossible combinations as invariant predicates.
4. Replace mutually exclusive booleans with a single enum (MISU).
5. Put remaining invariants as asserts in constructors and public mutators.
6. If a private method temporarily breaks the invariant, require restoration before return.

**Counterexample shape:** An input tuple that type-checks but violates the invariant.
**NestJS/TS mapping:** Discriminated unions instead of parallel booleans; Zod `.refine()` per invariant; class-validator invariants in constructors/setters; brand types.
**Book anchor:** Functional Correctness, Contracts vs Types.

### `decision_table_validity` [S2, S4]

A valid decision table is sound (no contradictory rows) and complete (no missing rows).

**Procedure:**
1. Extract every decision input from the AC; collapse infinite ranges into finite equivalence classes.
2. Compute expected row count = product of each input's value count.
3. Write the table, one row per combination, with output in the last column.
4. Count effective rows (each `any/-` counts as N, each `/` impossible counts as 0).
5. If effective rows < expected, the requirements are **incomplete**.
6. If effective rows > expected, the requirements are **unsound**.
7. Never place `any` to the left of a fixed value in another row — classic hidden-unsoundness trap.

**Counterexample shape:** A specific input tuple with no row, or a tuple that matches two rows producing different outputs.
**NestJS/TS mapping:** Literal-typed lookup table; exhaustive `switch` over discriminated unions so TS flags missing cases; or `ts-pattern`'s `.exhaustive()`.
**Book anchor:** Case Analysis / Decision Tables, Validity Footguns.

### `ambiguity_detection_via_predicates` [S2]

Translate each English AC clause into a logical predicate; ambiguity surfaces as multiple non-equivalent formalizations.

**Procedure:**
1. Split the user story sentence into atomic sub-requirements.
2. Write a predicate per sub-requirement.
3. Combine using `&&`, `||`, `=>`, looking for operator-precedence choices.
4. If more than one combination is plausibly consistent with the English, flag ambiguous.
5. Present each candidate formalization back to the product owner.
6. Record the chosen predicate as the canonical AC.

**Counterexample shape:** Two truth assignments that both read as "reasonable English" but produce different outputs.
**NestJS/TS mapping:** Express each atomic predicate as a named TS boolean-returning guard; combine explicitly with `&&`/`||`/parens in code.
**Book anchor:** Predicate Logic, Formalizing English.

### `modeling_requirements_as_constraints` [S3]

Express each business rule as a named `constraint` predicate using quantifiers.

**Procedure:**
1. Define record/sig declarations for each entity with fields and types (nullable via `T + NULL`).
2. For each rule, write `constraint Name = <predicate>` using `all`, `some`, `all disj`.
3. Use alternating quantifiers deliberately — `all x: some y: P` ≠ `some y: all x: P`.
4. For referential rules, write `all g: some u: IsAdmin(u,g)` style predicates.
5. For temporal rules, use `x` / `x'` for old/new values.
6. Review the named set with stakeholders — each name is a testable property.

**NestJS/TS mapping:** `Zod.refine((data) => <predicate>, {message: 'constraintName'})`; for cross-entity, a validator service iterating sets with `Array.every`/`some` mirroring `all`/`some`.
**Book anchor:** Database Constraints.

### `contradiction_detection_via_unsat` [S2]

Two AC clauses are contradictory iff their conjunction is unsatisfiable.

**Procedure:**
1. Collect all AC as a conjunction of predicates.
2. Build the decision table or an Alloy-style model.
3. Expand every `any`/`-` row to concrete expansions.
4. Look for two expanded rows with identical inputs and different outputs.
5. Alternatively, run a solver; `no model found` means the spec is contradictory.
6. Report the specific input tuple (or minimal unsat core).

**Counterexample shape:** A concrete input valuation that two rules map to incompatible outputs, or a proof of unsatisfiability.
**NestJS/TS mapping:** Property-based tests (fast-check) asserting all AC predicates simultaneously — a shrunk failing case is the contradiction witness.
**Book anchor:** Decision Tables, Validity Footguns.

### `change_assertions_old_new` [S3]

Specify mutations by relating the new value to the old using `old(x)` or primed `x'`.

**Procedure:**
1. Identify the mutable state the operation can change.
2. For each mutable field, write an `ensures` clause referencing both `old(field)` and `field`.
3. Split postcondition by outcome (`ok =>` vs `!ok =>`).
4. State explicit frame clauses for fields that must NOT change.
5. Where the language lacks `old`, capture a snapshot at entry and assert at exit.

**NestJS/TS mapping:** `structuredClone` at entry; runtime asserts comparing old vs new; in tests, `.toEqual` against captured snapshot for frame conditions.
**Book anchor:** Functional Correctness, Change Assertions.

### `refinement_check` [S3 — advanced]

When the ideal constraint is expensive, find a stronger cheap constraint and check `cheap => ideal`.

**Procedure:**
1. Write the ideal property as a predicate.
2. Propose an implementable property you can enforce.
3. Check `implementable => ideal` with a model-finder or exhaustive test.
4. If a counterexample is found, strengthen the implementable and re-check.
5. When no counterexample is found for a bounded scope, adopt the implementable.
6. Record the refinement so future changes are re-checked.

**NestJS/TS mapping:** Model both as TS functions; `fast-check` to search for inputs where `impl(x) && !ideal(x)`.
**Book anchor:** Data Modeling.

### `weaken_precond_strengthen_postcond` [S3, S6]

A replacement operation is safe iff it weakens (or preserves) preconditions and strengthens (or preserves) postconditions.

**Procedure:**
1. Take the abstraction's `R_a` and `E_a`.
2. Take the replacement's `R_b` and `E_b`.
3. Prove `R_a => R_b` (new requires no stronger).
4. Prove `E_b => E_a` (new ensures no weaker).
5. If either fails, the refactor/override is unsafe.
6. Apply the same rule when tightening an AC mid-project.

**NestJS/TS mapping:** Unit tests over old schema inputs run against new impl; TS variance rules on parameter/return types mirror this.
**Book anchor:** Functional Correctness, Polymorphism and Refactoring.

## Anti-patterns B5 warns against

- Placing `any/-` to the left of a fixed value in a decision table.
- Trusting row count as a validity proxy; a table can be both unsound and incomplete.
- Parallel booleans instead of a single enum (violates MISU).
- Treating types as a replacement for contracts (types cannot express "l is nonempty").
- Strengthening a precondition on the assumption "all callers satisfy it".
- Weakening a postcondition in a subclass (breaks Liskov).
- Modeling business rules only within SQL-native constraint limits.
- Letting an ambiguous English AC stand unformalized.
- Disabling asserts in production without per-assert deliberation.
- Using a decision table when decisions involve loops, recursion, or strongly dependent inputs.

## Vocabulary

- **precondition (requires)**: Must hold on entry; caller's obligation.
- **postcondition (ensures)**: Must hold on exit; callee's guarantee.
- **contract**: Pair (requires, ensures) + any type invariants.
- **type invariant**: Property holding for every value at all observable times.
- **assertion**: Statement false only if the program has a bug.
- **decision table**: Rows enumerating every input combination mapped to output.
- **sound (table)**: No two rows same inputs, different outputs.
- **complete (table)**: Every input combination has a row.
- **valid (table)**: Both sound and complete.
- **any value (-)**: Wildcard; input doesn't affect output.
- **impossible (/)**: Input combination cannot occur.
- **MISU**: Make Illegal States Unrepresentable.
- **constraint**: Named predicate quantified over records.
- **alternating quantifier**: Nested `all`/`some`; order matters.
- **change assertion**: `old(x)` vs `x'` in postconditions of mutators.
- **refinement**: Concrete/implementable property implies abstract/ideal property.
- **formal specification**: Spec that can be mechanically checked.
- **weaker/stronger precondition**: P weaker than Q iff `Q => P`.

## How this maps into the pipeline

| Stage | Techniques used |
|-------|-----------------|
| S2 Ambiguity Detection | `ambiguity_detection_via_predicates`, `decision_table_validity`, `contradiction_detection_via_unsat` |
| S3 Behavior Model | `preconditions_postconditions`, `type_and_class_invariants`, `change_assertions_old_new`, `modeling_requirements_as_constraints`, `refinement_check`, `weaken_precond_strengthen_postcond` |
| S4 Test Enumeration | `decision_table_validity` (apply as constructive table, not just validity check) |
| S6 Verdict | `weaken_precond_strengthen_postcond` (flag unsafe contract changes in the diff) |
