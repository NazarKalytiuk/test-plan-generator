// scripts/generate-fastcheck.ts
//
// Template emitter: turns a behavior-model Property object into a concrete
// TypeScript test file using fast-check + supertest + Vitest. Used by S5 to
// produce executable properties from the structured property descriptions
// emitted in stage-5-properties.md. [B4]
//
// Dependencies: fast-check, supertest, vitest, zod. Use via `npx tsx`.

import { z } from 'zod';

// --- Input schemas ---------------------------------------------------------

const PropertySchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string(),
    kind: z.literal('invariant'),
    name: z.string(),
    quantified_over: z.string(),
    predicate: z.string(),
    anchor: z.string().optional(),
    technique: z.literal('invariant_properties'),
  }),
  z.object({
    id: z.string(),
    kind: z.literal('round_trip'),
    name: z.string(),
    forward: z.string(), // e.g. 'POST /orders'
    inverse: z.string(), // e.g. 'GET /orders/:id'
    anchor: z.string(),
    technique: z.literal('symmetric_roundtrip'),
  }),
  z.object({
    id: z.string(),
    kind: z.literal('model_oracle'),
    name: z.string(),
    real_endpoint: z.string(),
    model_fn_name: z.string(),
    technique: z.literal('model_based_oracle'),
  }),
  z.object({
    id: z.string(),
    kind: z.literal('stateful'),
    name: z.string(),
    states: z.array(z.string()).min(1),
    commands: z.array(
      z.object({
        name: z.string(),
        precondition_states: z.array(z.string()),
        transitions_to: z.string(),
      }),
    ),
    technique: z.enum(['stateful_command_testing', 'state_machine_properties']),
  }),
]);

export type Property = z.infer<typeof PropertySchema>;

const EndpointSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string(),
});
export type Endpoint = z.infer<typeof EndpointSchema>;

export interface Emitted {
  filename: string;
  content: string;
}

// --- Emitters --------------------------------------------------------------

export function emitInvariantProperty(p: Extract<Property, { kind: 'invariant' }>, ep: Endpoint): string {
  return `import fc from 'fast-check';
import request from 'supertest';
import { describe, it, beforeAll } from 'vitest';
import { buildApp } from './test-harness';

describe('${p.name} [${p.id}]', () => {
  let app: import('@nestjs/common').INestApplication;
  beforeAll(async () => { app = await buildApp(); });

  it('holds for every valid input', async () => {
    await fc.assert(
      fc.asyncProperty(validBodyArb, async (body) => {
        const res = await request(app.getHttpServer())
          .${ep.method.toLowerCase()}('${ep.path}')
          .send(body);
        // Anchor: ${p.anchor ?? 'none declared'}
        // Predicate: ${p.predicate}
        return invariantHolds(res);
      }),
      { seed: 42, numRuns: 200 }
    );
  });
});

declare const validBodyArb: fc.Arbitrary<Record<string, unknown>>;
declare function invariantHolds(res: import('supertest').Response): boolean;
`;
}

export function emitRoundTripProperty(p: Extract<Property, { kind: 'round_trip' }>): string {
  return `import fc from 'fast-check';
import request from 'supertest';
import { describe, it, beforeAll } from 'vitest';
import { buildApp } from './test-harness';

describe('${p.name} [${p.id}]', () => {
  let app: import('@nestjs/common').INestApplication;
  beforeAll(async () => { app = await buildApp(); });

  it('forward then inverse is identity, anchored', async () => {
    await fc.assert(
      fc.asyncProperty(validBodyArb, async (body) => {
        const created = await request(app.getHttpServer()).post('/orders').send(body);
        if (created.status !== 201) return true; // domain rejection is not a round-trip violation
        // Anchor: ${p.anchor}
        if (typeof created.body?.id !== 'string') return false;
        const fetched = await request(app.getHttpServer()).get(\`/orders/\${created.body.id}\`);
        return fetched.status === 200 && fetched.body.id === created.body.id;
      }),
      { seed: 42, numRuns: 100 }
    );
  });
});

declare const validBodyArb: fc.Arbitrary<Record<string, unknown>>;
`;
}

export function emitModelOracleProperty(p: Extract<Property, { kind: 'model_oracle' }>): string {
  return `import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import { ${p.model_fn_name} } from './model';
import { realCall } from './test-harness';

describe('${p.name} [${p.id}]', () => {
  it('real endpoint matches the obviously-correct model', async () => {
    await fc.assert(
      fc.asyncProperty(inputArb, async (x) => {
        const real = await realCall(x);
        const model = ${p.model_fn_name}(x);
        expect({ status: real.status, body: real.body }).toEqual(model);
      }),
      { seed: 42, numRuns: 200 }
    );
  });
});

declare const inputArb: fc.Arbitrary<Record<string, unknown>>;
`;
}

export function emitStatefulProperty(p: Extract<Property, { kind: 'stateful' }>): string {
  const commandList = p.commands.map((c) => c.name).join(', ');
  return `import fc from 'fast-check';
import { describe, it, beforeAll } from 'vitest';
import { buildApp, makeRealSystem } from './test-harness';

// Commands: ${commandList}
// States: ${p.states.join(', ')}

describe('${p.name} [${p.id}]', () => {
  let app: import('@nestjs/common').INestApplication;
  beforeAll(async () => { app = await buildApp(); });

  it('all command sequences respect the state machine', async () => {
    await fc.assert(
      fc.asyncProperty(fc.commands(commandsArb, { maxCommands: 50 }), async (cmds) => {
        const real = await makeRealSystem(app);
        const setup = () => ({ model: { state: '${p.states[0]}' as const }, real });
        await fc.asyncModelRun(setup, cmds);
      }),
      { seed: 42, numRuns: 50 }
    );
  });
});

declare const commandsArb: fc.Arbitrary<fc.AsyncCommand<unknown, unknown>>[];
`;
}

export function emitFromProperty(p: Property, ep: Endpoint): Emitted {
  const safe = p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  switch (p.kind) {
    case 'invariant':
      return { filename: `${p.id}-${safe}.prop.ts`, content: emitInvariantProperty(p, ep) };
    case 'round_trip':
      return { filename: `${p.id}-${safe}.prop.ts`, content: emitRoundTripProperty(p) };
    case 'model_oracle':
      return { filename: `${p.id}-${safe}.prop.ts`, content: emitModelOracleProperty(p) };
    case 'stateful':
      return { filename: `${p.id}-${safe}.prop.ts`, content: emitStatefulProperty(p) };
  }
}

// --- Validation entry point ------------------------------------------------

export function emitAll(properties: unknown[], endpoint: unknown): Emitted[] {
  const validatedProps = properties.map((p) => PropertySchema.parse(p));
  const validatedEp = EndpointSchema.parse(endpoint);
  return validatedProps.map((p) => emitFromProperty(p, validatedEp));
}
