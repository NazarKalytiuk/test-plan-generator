// One-off validator used to prove verdict.schema.json covers both example verdicts.
// Not shipped to end users; lives under scripts/ so it shares the node_modules install.
import Ajv from 'ajv/dist/2020.js';
import { readFileSync } from 'node:fs';

const schema = JSON.parse(readFileSync('../schemas/verdict.schema.json', 'utf8'));
const ajv = new Ajv.default({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
const examples = [
  '../examples/01-happy-path/expected-verdict.json',
  '../examples/02-ambiguous-story/expected-verdict.json',
];
let failed = false;
for (const ex of examples) {
  const doc = JSON.parse(readFileSync(ex, 'utf8'));
  const ok = validate(doc);
  if (ok) console.log(ex, ': OK');
  else {
    console.log(ex, ': FAIL');
    console.log(JSON.stringify(validate.errors, null, 2));
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
