# Stage 1 — Story Parsing (prompt fragment)

**Input:** `story.text` (string), `story.language` (en|uk|auto), optional `openapi`.

**Language detection:** If `story.language == 'auto'`, detect by character set. If majority Cyrillic → treat as Ukrainian. Translate each AC into English internally; KEEP the original noun/verb phrases in `glossary` so the final output can speak the user's Ubiquitous Language. If translation is uncertain on a domain term, preserve the original and flag it in `glossary[term].uncertain: true`.

**Do the following in order:**

1. **Derive scope from goals.** [B1] Find the "in order to" clause; if absent, infer the goal from the "As a X" actor + "I want Y" capability. Reject the story ONLY if no actor or capability is stated.
2. **Extract the operation.** Identify the HTTP verb (POST/GET/PUT/DELETE/PATCH) and the resource URL. If `openapi` is provided, prefer its path/verb; otherwise infer from the story.
3. **Extract inputs.** For each input field named in the story, record `{name, type, origin: 'body'|'query'|'path'|'header', constraint?}`.
4. **Extract outputs.** For each outcome branch (success + each distinct error class), record `{status, body_shape, headers?}`.
5. **Decompose AC into Given-When-Then.** [B1] Each AC → one `{given, when, then}` with exactly ONE `when`. If the AC contains multiple `when` steps, split it or fold incidentals into `given` (flag as `scripts_are_not_specifications` violation but still parse).
6. **Produce key examples.** [B1] Pick one happy-path, one boundary, one negative. Use concrete realistic values (e.g. `amount: 100`, not "a positive number"). Record each as `{id, inputs, expected_outputs}`.
7. **Build the glossary.** [B1] Every domain noun or verb that appears more than once gets a glossary entry: `{term, definition, lang_original?}`.

**Output JSON (exact shape):**

```json
{
  "stage": "S1",
  "language_detected": "en",
  "actors": ["customer"],
  "operation": { "http_verb": "POST", "path": "/orders", "summary": "Create order" },
  "inputs": [
    {"name": "amount", "type": "number", "origin": "body", "constraint": "positive"},
    {"name": "currency", "type": "string", "origin": "body", "constraint": "ISO-4217"}
  ],
  "outputs": [
    {"branch": "success", "status": 201, "body_shape": {"id": "uuid", "status": "PENDING", "amount": "number"}},
    {"branch": "validation_error", "status": 400, "body_shape": {"errors": "object"}}
  ],
  "ac": [
    {"id": "AC-1", "given": "authenticated customer", "when": "POST /orders with valid body", "then": "201 Created with order id"},
    {"id": "AC-2", "given": "authenticated customer", "when": "POST /orders with amount <= 0", "then": "400 with errors.amount"}
  ],
  "key_examples": [
    {"id": "KE-happy", "inputs": {"amount": 100, "currency": "USD"}, "expected_outputs": {"status": 201, "body.status": "PENDING"}},
    {"id": "KE-boundary", "inputs": {"amount": 0.01, "currency": "USD"}, "expected_outputs": {"status": 201}},
    {"id": "KE-negative", "inputs": {"amount": 0, "currency": "USD"}, "expected_outputs": {"status": 400, "body.errors.amount": "defined"}}
  ],
  "glossary": [
    {"term": "order", "definition": "A customer's intent to purchase, identified by a UUID and a lifecycle state."},
    {"term": "PENDING", "definition": "Initial order state before payment capture."}
  ],
  "notes": []
}
```

**Pass criteria:**
- Every AC has a Given-When-Then restatement with exactly one `when`.
- Every domain noun used in AC appears in `glossary`.
- `key_examples[]` has ≥ 1 happy-path + ≥ 1 boundary + ≥ 1 negative.
- If the story is in Ukrainian, every glossary entry includes `lang_original`.

**Do NOT:** invent ACs not stated in the story; paraphrase using jargon; replace concrete values with placeholders like "some value".
