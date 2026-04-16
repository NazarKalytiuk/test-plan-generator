# B4 — Hebert, *Property-Based Testing with PropEr, Erlang, and Elixir* (Pragmatic Bookshelf)

Source for stage **S5 (Property Derivation)**. Techniques translated to `fast-check` (TypeScript).

## Techniques

### `invariant_properties` [S5]

Encode local facts that must always hold on outputs, combining many small invariants.

**Procedure:**
1. Identify facts that must always be true of output/state (size preserved, ordering between pairs, membership, no data added/removed).
2. Write a separate property per fact over randomly generated inputs.
3. Prefer local invariants (pairwise/element-level) over full-output descriptions.
4. Combine many weak invariants so the conjunction meaningfully constrains correctness.
5. Run each property independently so failures point to the specific invariant.

**Counterexample shape:** Minimal input that violates one invariant; fast-check shrinks to smallest triggering value.
**fast-check mapping:** `fc.assert(fc.property(fc.record({...}), (input) => { const out = callApi(input); return invariantHolds(out); }))`; one `fc.property` per invariant; `fc.pre` for domain constraints.
**Book anchor:** Chapter 3, Invariants.

### `model_based_oracle` [S5]

Compare the real implementation against a simpler, obviously-correct reference model.

**Procedure:**
1. Write a second implementation so simple it is obviously correct.
2. Alternatively adopt an external reference from another library.
3. Generate arbitrary inputs with a matching generator.
4. Assert real and model return equal outputs on every input.
5. Keep the model free of the real system's optimizations.

**Counterexample shape:** Shrunk input where real and model diverge.
**fast-check mapping:** `fc.assert(fc.property(inputArb, (x) => expect(realImpl(x)).toEqual(modelImpl(x))))`; for HTTP APIs, model can be an in-memory store compared against the service response.
**Book anchor:** Chapter 3, Modeling.

### `symmetric_roundtrip` [S5]

For reversible operation pairs, assert `decode(encode(x)) == x`, anchored by a small invariant forcing real work.

**Procedure:**
1. Identify a pair of inverse operations: encode/decode, serialize/parse, create/delete.
2. Generate arbitrary payloads.
3. Assert forward then inverse yields the original.
4. Add an anchor invariant on the intermediate value to prevent trivial identity implementations passing.
5. Combine with traditional examples or invariants for anchoring.

**Counterexample shape:** Smallest payload where roundtrip differs; shrinks toward minimal structure exposing lossy encoding.
**fast-check mapping:** `fc.assert(fc.property(payloadArb, (p) => { const enc = encode(p); return typeof enc === 'string' && deepEqual(decode(enc), p); }))`.
**Book anchor:** Chapter 3, Symmetric Properties.

### `custom_generator_composition` [S5]

Build domain-realistic generators by composing primitives with map/filter/frequency/recursion.

**Procedure:**
1. Start from default primitive generators (ints, strings, lists).
2. Use LET-style mapping (`fc.map`/`fc.chain`) to transform primitives into domain shapes.
3. Constrain with `fc.filter` only when domain is dense; otherwise build valid data directly.
4. Weight alternatives with `fc.oneof` + weights so realistic values dominate.
5. Use sized/resize to tune payload size.
6. Gather statistics on the distribution.

**fast-check mapping:** `fc.record({email: fc.oneof({arbitrary:emailArb, weight:4}, {arbitrary:fc.string(), weight:1}), items: fc.array(itemArb, {maxLength:10})})` composed via `fc.chain` for dependent fields.
**Book anchor:** Chapter 4.

### `recursive_lazy_generators` [S5]

Generate trees, grammars, and nested payloads via size-bounded recursion.

**Procedure:**
1. Define a base case generator for size 0.
2. Define a recursive case that decreases size and uses lazy wrapping.
3. Combine base and recursive in a size-aware chooser.
4. For opaque runtime objects, use symbolic calls so counterexamples print construction steps.
5. Tune recursion depth via size so shrinking reduces tree depth.

**fast-check mapping:** `fc.letrec(tie => ({ tree: fc.oneof({depthSize:'small'}, leafArb, fc.record({left:tie('tree'), right:tie('tree')})) })).tree`.
**Book anchor:** Chapter 4, Fancy Custom Generators.

### `shrinking_recenter_divide` [S5]

Control shrinking so failures reduce to the smallest readable counterexample.

**Procedure:**
1. Understand default shrink targets: numbers→0, lists→[], oneof→first element.
2. When a custom shrink target isn't minimal, re-center toward a simpler generator.
3. For composite generators, expose sub-components so shrinking divides and drops parts independently.
4. Keep initial state deterministic so shrinking is reproducible.
5. After a failure, use the shrunk (not initial) counterexample.

**fast-check mapping:** Prefer `fc.record`/`fc.tuple` over `fc.map` so fast-check can shrink each field; use `fc.constantFrom` for enums; add `.noShrink()` only where needed; read only the final shrunk value.
**Book anchor:** Chapter 7.

### `stateful_command_testing` [S5]

Generate sequences of symbolic commands against an abstract model; execute on the real system; validate postconditions.

**Procedure:**
1. Define a deterministic initial model state.
2. List symbolic commands; each with an argument generator.
3. Write preconditions restricting when commands are valid given current state.
4. Write a `next_state` function describing how the model updates.
5. Write postconditions checking the real response matches the model prediction.
6. Generate sequences symbolically, execute against real, shrink on failure.

**fast-check mapping:** `fc.assert(fc.property(fc.commands(commandsArb, {maxCommands:50}), (cmds) => { const real = makeRealSystem(); const model = initialState; fc.modelRun({model, real}, cmds); }))`; each command is a `Command` with `check` (pre) and `run` (post).
**Book anchor:** Chapter 9–10.

### `state_machine_properties` [S5]

Model systems whose valid command set depends on an explicit named state.

**Procedure:**
1. Enumerate the named states (e.g. closed, open, half-open, blocked).
2. Define a generator per state listing allowed commands.
3. Encode transitions as `next_state` keyed by (state, command).
4. Add preconditions for commands valid only in specific states.
5. Postcondition: real system's observable state matches modeled target.
6. Use shim wrappers so each call is explicit.

**fast-check mapping:** `fc.commands` with commands filtered by current `model.state` inside each `Command`'s `check()`; model holds `{state: 'open'|'closed'|...}`; `run()` verifies the real observable state.
**Book anchor:** Chapter 11.

### `parallel_stateful_testing` [S5 — OPT-IN]

Probe for race conditions by executing interleaved command sequences.

**Procedure:**
1. Start from a passing sequential stateful property.
2. Split the generated command list into concurrent branches.
3. Collect observed history from all branches.
4. Search for any sequential interleaving the model accepts.
5. On failure, shrink commands and interleaving to a minimal race-exposing trace.

**fast-check mapping:** `fc.asyncProperty(fc.scheduler(), fc.commands(cmdsArb), async (s, cmds) => { await fc.asyncModelRun({model, real, s}, cmds); })`.
**Book anchor:** Chapter 9, Testing Parallel Executions.

### `targeted_properties` [S5 — OPT-IN]

Use simulated-annealing feedback to steer the generator toward worst-case inputs.

**Procedure:**
1. Pick a numeric metric that grows as the property approaches failure.
2. Use a targeted `forall` that feeds the metric back.
3. Call maximize/minimize to bias generation toward worse cases.
4. Provide a custom neighbor function when default mutations underexplore.
5. Avoid recursive/lazy generators in targeted mode.
6. Run with a search-steps budget.

**fast-check mapping:** Not native; approximate via a custom search loop: sample, score, mutate highest scorers, re-run.
**Book anchor:** Chapter 8.

## Anti-patterns B4 warns against

- A property body that is a copy of the implementation (tautological test).
- A single invariant that a trivial implementation can satisfy.
- Round-trip properties without an anchor invariant.
- Non-deterministic `initial_state` in stateful tests.
- Inspecting/matching values from the real system inside the model during the symbolic phase.
- Side effects in `precondition`/`next_state`/command-generation callbacks.
- Trusting the first huge failing counterexample instead of the shrunk one.
- Overly permissive default generators when domain needs steering.
- Using `fc.filter` when the domain is sparse.
- Postconditions so lax that many outputs pass.
- Recursive/lazy generators with targeted properties.

## Vocabulary

- **Property**: Universally-quantified assertion over a generator.
- **Generator**: Spec for producing random values.
- **Invariant**: A fact that must always hold.
- **Model**: Simple, obviously-correct alternative implementation.
- **Oracle**: Pre-existing reference implementation.
- **Symmetric property**: Round-trip assertion.
- **Symbolic call**: Abstract function call (name + args) for readable counterexamples.
- **Command / Precondition / Postcondition / next_state**: Stateful testing elements.
- **Shrinking**: Automated reduction of failing counterexample.
- **Re-centering (?SHRINK)**: Custom shrink target generator.
- **Dividing (?LETSHRINK)**: Exposing sub-components so shrinker reduces each independently.
- **Targeted property**: Feedback-driven search.
- **Parallel stateful property**: Concurrent branches; passes iff some interleaving matches.
- **Shim**: Thin wrapper exposing each operation explicitly.
- **Anchor**: A small invariant or example preventing trivial implementations passing.

## How this maps into the pipeline

| Stage | Techniques used |
|-------|-----------------|
| S5 Property Derivation | `invariant_properties`, `model_based_oracle`, `symmetric_roundtrip`, `custom_generator_composition`, `recursive_lazy_generators`, `shrinking_recenter_divide`, `stateful_command_testing`, `state_machine_properties`. OPT-IN: `parallel_stateful_testing`, `targeted_properties`. |
