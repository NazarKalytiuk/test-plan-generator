# B1 — Adzic, *Specification by Example* (Manning, 2011)

Source for stages **S1 (Story Parsing)** and **S6 (Verdict — living documentation view)**.

## Techniques

### `derive_scope_from_goals` [S1]

Start from a measurable business goal, then collaboratively derive user stories and scope rather than accepting preselected solutions.

**Procedure:**
1. Capture the business goal as a measurable outcome.
2. Identify who needs the capability and why (the "as a" and "in order to").
3. Ask business users for examples of useful outputs the system must produce.
4. Let the delivery team propose the "I want" solution that satisfies the goal.
5. Challenge each suggested story by asking for an alternative solution.
6. Record the resulting scope as user stories that explicitly link to the goal.

**Counterexample shape:** Stories that describe a UI solution but cannot be traced to a measurable business outcome.
**NestJS/TS mapping:** Encode the goal as a top-level `describe()` block in Vitest; each user story becomes a nested `describe` with a `@goal` JSDoc tag.
**Book anchor:** Ch 2 "Deriving scope from goals"; Ch 5 "Building the right scope".

### `specify_collaboratively_three_amigos` [S1, S2]

Business analyst, developer, and tester jointly produce specifications so knowledge from all roles is baked in before coding.

**Procedure:**
1. Choose a collaboration model: all-team workshop, Three Amigos, pair-writing, or informal conversation.
2. Prepare initial examples and open questions ahead so stakeholders can contribute.
3. Analyst states the rule, developer surfaces technical edge cases, tester surfaces risk cases.
4. Produce the Given-When-Then feature file live on a shared screen so the output is the final artifact.
5. Run a feedback exercise: each person writes how the system should behave for a new edge case; compare answers.
6. Flag unresolved questions; assign an owner to close them before implementation.

**Counterexample shape:** Analyst writes tests alone and hands them to developers; feedback exercise reveals divergence.
**NestJS/TS mapping:** Pair on describe/it skeletons; commit empty `.spec.ts` stubs with TODOs. Store Gherkin `.feature` files alongside the NestJS module.
**Book anchor:** Ch 2 "Specifying collaboratively"; Ch 6 "The most popular collaborative models".

### `illustrate_with_key_examples` [S1, S4]

Replace abstract rules with a small set of precise, complete, realistic, concrete examples that teams can share without translation.

**Procedure:**
1. Elicit a basic happy-path example directly from a business user.
2. Ask the tester for a case that would break the rule (negative / edge).
3. Ask the developer for a technical boundary example.
4. Rewrite yes/no outputs as concrete values to remove hidden assumptions.
5. Replace abstract equivalence classes ("less than 10") with representative concrete values.
6. Keep only the minimal representative set; move exhaustive combinations to a supplementary pack.

**Counterexample shape:** Specs with yes/no columns, "customer A" placeholders, or a hundred combinatorial rows.
**NestJS/TS mapping:** Model each key example as a Vitest `it.each()` row with concrete values; instantiate class-validator DTOs from example data.
**Book anchor:** Ch 2 "Illustrating using examples"; Ch 7 "Examples should be precise/complete/realistic".

### `given_when_then_structure` [S1]

Write every scenario as precondition, single action, expected postcondition so each spec focuses on one business rule.

**Procedure:**
1. State the Given: minimal context/preconditions.
2. State a single When: exactly one triggering business action.
3. State the Then: observable postconditions that objectively define success.
4. If multiple actions feel required, extract them into a higher-level domain concept.
5. Use the domain Ubiquitous Language for all nouns and verbs.
6. Review: the scenario should read like prose a business user can verify.

**Counterexample shape:** A scenario with multiple When steps or a script of "log on, navigate, click, verify".
**NestJS/TS mapping:** Bind `.feature` files via jest-cucumber; in pure Vitest, map `Given` to `beforeEach`, `When` to the action under test, `Then` to `expect()`.
**Book anchor:** Ch 8 "Use Given-When-Then language in specifications".

### `refine_specification_polish` [S1]

Extract a self-explanatory, focused, domain-language specification from raw workshop examples; do not ship the whiteboard.

**Procedure:**
1. Give the specification a descriptive searchable title naming the business rule.
2. Write one short paragraph explaining the rule so readers do not reverse-engineer it from data.
3. Split a bloated spec when it describes more than one business rule.
4. Remove incidental attributes from example rows.
5. Translate any technical/implementation names back into domain Ubiquitous Language.
6. Run the "show and keep quiet" test: hand the doc to a new reader.

**NestJS/TS mapping:** Name Vitest `describe` blocks after the business rule, not the class. Add a top-of-file JSDoc paragraph summarizing intent.
**Book anchor:** Ch 8 "Refining the specification".

### `scripts_are_not_specifications` [S1, S4]

Specifications say *what* the system does; scripts say *how* to test it — keep the two apart.

**Procedure:**
1. If the example describes "first do X, then Y, then Z", flag it as a script.
2. Ask "what business rule is this illustrating?" and rewrite around that rule.
3. Push UI navigation, login, and workflow prerequisites into the automation layer.
4. Replace multi-step flows with a single action naming the domain operation.
5. Ensure the spec survives a UI redesign without edits to the `.feature` file.

**NestJS/TS mapping:** Keep supertest/Playwright sequences inside step-definition files or test helpers; the `it()` title must read as a business rule.
**Book anchor:** Ch 8 "Scripts are not specifications".

### `automate_without_changing_specs` [S4, S6]

Bind automation code to the human-readable spec via fixtures/step definitions so the spec stays the single source of truth.

**Procedure:**
1. Keep the specification in human-readable text.
2. Write fixtures/step definitions in a separate layer that references the spec.
3. Plan the automation effort upfront inside the iteration.
4. Automate below the UI where possible; use UI only when no API exists.
5. Apply sensible defaults so specs only mention attributes relevant to the rule.
6. Re-run automation on every change.

**NestJS/TS mapping:** Use jest-cucumber `loadFeature`; automation calls NestJS providers resolved from `Test.createTestingModule`, or hits HTTP via supertest. Push auth/seeding/cleanup into `Given` step defs, not into the feature file.
**Book anchor:** Ch 2 "Automating validation without changing specifications"; Ch 9.

### `living_documentation` [S6]

Treat the validated specifications as the authoritative documentation of the system, organized and maintained as a first-class artifact.

**Procedure:**
1. Store executable specifications in version control alongside the code.
2. Organize specs hierarchically by business capability.
3. Run all specs frequently on CI; resolve differences immediately.
4. After a story is done, restructure the new specs into the existing hierarchy.
5. Publish a browsable site for non-technical stakeholders.
6. Budget explicit time for spec maintenance.

**NestJS/TS mapping:** Co-locate `.feature` files with the NestJS module they describe; generate static docs with cucumber-html-reporter or compodoc.
**Book anchor:** Ch 2/3 "Evolving a documentation system"; Ch 11 "Living documentation".

### `dont_overspecify_happy_path_first` [S1, S4]

Write only representative key examples first; add edge cases as exploratory tests in a supplementary pack instead of bloating the spec.

**Procedure:**
1. Write a single happy-path example that drives the automation skeleton.
2. Add one example per important business rule and one per technical boundary.
3. Stop when the set covers the conditions of satisfaction agreed with the business.
4. For combinatorial exploration, create a separate automated test.
5. Run the main spec on every commit; run the supplementary pack overnight.

**NestJS/TS mapping:** Keep describe/it key examples in `*.spec.ts` that runs on every PR; move exhaustive `it.each` combinations into `*.exhaustive.spec.ts`.
**Book anchor:** Ch 8 "Don't overspecify examples".

### `ubiquitous_language_in_specs` [S1, S6]

Use one shared domain vocabulary across conversations, specs, and code so translation disappears.

**Procedure:**
1. Build a glossary of domain terms during collaboration; capture it as a living artifact.
2. Reject jargon invented purely for testing.
3. Audit specifications for DB identifiers, class names, or framework terms.
4. Name domain concepts consistently in code.
5. When a new concept emerges, promote it to a named term.

**NestJS/TS mapping:** Name NestJS modules, services, DTOs, and Vitest `describe` blocks from the same glossary. Use class-validator messages that speak the business language.
**Book anchor:** Ch 8 "Specifications should be in domain language".

## Anti-patterns B1 warns against

- Accepting user stories as a pre-designed solution instead of deriving scope from goals.
- Writing specs in isolation without cross-role collaboration.
- Using yes/no answers or abstract classes instead of concrete values.
- Inventing example data instead of using real data.
- Exploring every combinatorial possibility in the main spec.
- Writing scripts ("log on, click, verify") and calling them specifications.
- Coupling specs to DB ids, class names, or UI workflow.
- Postponing automation to a separate team after the spec is "done".
- Automating existing manual test scripts verbatim.
- Over-automating through the UI once alternatives exist.
- Treating tests and living documentation as second-grade artifacts.
- Using "nonfunctional requirements" as an excuse to avoid precise illustration.
- Keeping many small specs that together describe one feature, or one huge spec for many.

## Vocabulary

- **Specification by Example**: A set of process patterns for delivering the right software via precise, shared examples.
- **Business goal**: The measurable underlying reason for a project; the root from which scope is derived.
- **Scope**: User stories derived from a business goal; distinct from acceptance criteria.
- **User story**: "As a X, in order to Y, I want Z".
- **Key example**: A precise, complete, realistic, easy-to-understand concrete case illustrating one rule.
- **Specification with examples**: Title + paragraph + minimal key examples.
- **Executable specification**: A spec connected to automation without modifying the human-readable document.
- **Acceptance test**: In SBE, identical to the executable specification.
- **Living documentation**: Reliable, browsable system documentation made of frequently validated specs.
- **Given-When-Then**: Context / single action / expected postconditions.
- **Script**: A step-by-step description of how to operate the system — inferior to a spec.
- **Three Amigos**: Developer + tester + BA/PO collaboration model.
- **Feedback exercise**: Independently write expected behavior, then compare.
- **Ubiquitous Language**: A single shared vocabulary across conversation, specs, and code.
- **Automation layer**: Code binding specs to the system; hides workarounds, defaults, dependency setup.
- **Challenging requirements**: Pushing back on solutions to surface real goals.
- **Boomerang**: A done story that returns later because edge cases were not illustrated.

## How this maps into the pipeline

| Stage | Techniques used |
|-------|-----------------|
| S1 Story Parsing | `derive_scope_from_goals`, `illustrate_with_key_examples`, `given_when_then_structure`, `refine_specification_polish`, `ubiquitous_language_in_specs`, `scripts_are_not_specifications`, `dont_overspecify_happy_path_first` |
| S2 Ambiguity Detection | `specify_collaboratively_three_amigos` (phrasing of blocking_questions) |
| S4 Test Enumeration | `illustrate_with_key_examples` (representative seed), `scripts_are_not_specifications` (reject flow-style tests) |
| S6 Verdict | `automate_without_changing_specs`, `living_documentation`, `ubiquitous_language_in_specs` (glossary in the output) |
