// scripts/run-executable-mode.ts
//
// Runs the test files produced by S4 (it.each tables) and S5 (fast-check
// properties) and maps each result into a verdict check classification:
//   green              -> COMPLIANT
//   red (counterexample) -> VIOLATED with counterexample
//   timeout/skip/fail  -> UNDETERMINED with reason = 'executable_mode_failed'
//
// Usage:
//   npx tsx scripts/run-executable-mode.ts --tests-dir ./generated-tests \
//       --model ./S5-behavior-model.json --timeout-ms 60000
//
// Dependencies: vitest, zod, ajv. No global installs.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import Ajv from 'ajv/dist/2020';

const CliArgsSchema = z.object({
  testsDir: z.string(),
  model: z.string().optional(),
  timeoutMs: z.number().int().positive().default(60_000),
  out: z.string().default('./verdict-executable-map.json'),
});
type CliArgs = z.infer<typeof CliArgsSchema>;

function parseArgs(argv: string[]): CliArgs {
  const map: Record<string, string> = {};
  for (let i = 2; i < argv.length; i += 2) {
    const k = argv[i];
    const v = argv[i + 1];
    if (!k || !v) break;
    map[k.replace(/^--/, '').replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = v;
  }
  return CliArgsSchema.parse({
    testsDir: map.testsDir ?? './generated-tests',
    model: map.model,
    timeoutMs: map.timeoutMs ? Number(map.timeoutMs) : 60_000,
    out: map.out ?? './verdict-executable-map.json',
  });
}

interface VitestTestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  errors?: Array<{ message: string; expected?: unknown; actual?: unknown }>;
}

interface VitestAssertionResult {
  ancestorTitles: string[];
  title: string;
  fullName: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped' | 'todo';
  duration?: number;
  failureMessages?: string[];
}

interface VitestRunSummary {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  testResults: Array<{
    name: string;
    status: 'passed' | 'failed';
    assertionResults: VitestAssertionResult[];
  }>;
}

interface MappedCheck {
  id: string;
  status: 'COMPLIANT' | 'VIOLATED' | 'UNDETERMINED';
  evidence?: string;
  counterexample?: {
    kind: 'failing_test_row' | 'shrunk_fastcheck' | 'timeout';
    value: unknown;
    description: string;
  };
  reason?: string;
}

function runVitest(testsDir: string, timeoutMs: number): Promise<VitestRunSummary> {
  return new Promise((resolve, reject) => {
    const reporterOut = path.join(testsDir, '.vitest-report.json');
    const proc = spawn(
      'npx',
      ['vitest', 'run', '--reporter=json', `--outputFile=${reporterOut}`, testsDir],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`vitest timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('exit', (code) => {
      clearTimeout(timer);
      if (!existsSync(reporterOut)) {
        reject(new Error(`vitest produced no report; exit code ${code ?? 'null'}`));
        return;
      }
      try {
        const raw = readFileSync(reporterOut, 'utf8');
        const parsed = JSON.parse(raw) as VitestRunSummary;
        resolve(parsed);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    proc.on('error', reject);
  });
}

function extractFastCheckCounterexample(failureMessages: string[] | undefined): unknown {
  if (!failureMessages) return null;
  for (const msg of failureMessages) {
    const match = msg.match(/Counterexample:\s*(\[.*\]|\{.*\})/s);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return null;
}

function mapAssertion(a: VitestAssertionResult): MappedCheck {
  const id = a.fullName.replace(/\s+/g, '_').slice(0, 120);
  if (a.status === 'passed') {
    return { id, status: 'COMPLIANT', evidence: `vitest:${a.fullName}` };
  }
  if (a.status === 'failed') {
    const shrunk = extractFastCheckCounterexample(a.failureMessages);
    return {
      id,
      status: 'VIOLATED',
      counterexample: shrunk
        ? { kind: 'shrunk_fastcheck', value: shrunk, description: 'fast-check shrunk counterexample' }
        : {
            kind: 'failing_test_row',
            value: (a.failureMessages ?? []).join('\n'),
            description: 'vitest failing test',
          },
    };
  }
  return {
    id,
    status: 'UNDETERMINED',
    reason: 'executable_mode_failed',
    counterexample: {
      kind: 'timeout',
      value: a.status,
      description: `test was ${a.status}`,
    },
  };
}

function mapSummary(summary: VitestRunSummary): MappedCheck[] {
  const out: MappedCheck[] = [];
  for (const file of summary.testResults) {
    for (const assertion of file.assertionResults) {
      out.push(mapAssertion(assertion));
    }
  }
  return out;
}

// Minimal sanity check: the output must conform to a subset of verdict.schema.json.
const MinimalVerdictMapSchema = {
  type: 'object',
  required: ['mapped_checks'],
  additionalProperties: false,
  properties: {
    mapped_checks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'status'],
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['COMPLIANT', 'VIOLATED', 'UNDETERMINED'] },
          evidence: { type: 'string' },
          reason: { type: 'string' },
          counterexample: {},
        },
      },
    },
  },
} as const;

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(MinimalVerdictMapSchema);

  let mapped: MappedCheck[];
  try {
    const summary = await runVitest(args.testsDir, args.timeoutMs);
    mapped = mapSummary(summary);
  } catch (err) {
    mapped = [
      {
        id: 'executable_mode_runner',
        status: 'UNDETERMINED',
        reason: 'executable_mode_failed',
        counterexample: {
          kind: 'timeout',
          value: err instanceof Error ? err.message : String(err),
          description: 'vitest runner did not complete',
        },
      },
    ];
  }

  const payload = { mapped_checks: mapped };
  if (!validate(payload)) {
    throw new Error(`Output schema violation: ${ajv.errorsText(validate.errors)}`);
  }
  writeFileSync(args.out, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${mapped.length} mapped checks to ${args.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
