import { describe, expect, it } from 'vitest';
import {
  ProgressTracker,
  type ProgressSnapshot,
} from '../core/models/progress-tracker';
import {
  TerminalProgressEngine,
  type TerminalProgressInstruction,
} from './terminal-progress-engine';

describe(TerminalProgressEngine, () => {
  it('engine diffs snapshots to instructions', () => {
    const { tracker, computeInstructions } = setUp();

    const phase = tracker.beginScanning({ enricherCount: 1 });
    const enricher = phase.createEnricherStep({ name: 'code' });
    enricher.setDetectedFileCount(5);
    enricher.done();
    phase.done();

    const instructions = computeInstructions();

    expect(instructions).toEqual([
      { kind: 'intro', message: 'Scanning started' },
      { kind: 'spinnerStart', message: '[1/1] code' },
      { kind: 'spinnerMessage', message: '[1/1] code · 5 files detected' },
      { kind: 'spinnerStop', message: '[1/1] code · 5 files detected' },
      { kind: 'outro', message: 'Scanning finished' },
    ]);
  });

  it('engine formats enricher step display with numbered prefix', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginScanning({ enricherCount: 2 })
      .createEnricherStep({ name: 'code' });

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerStart',
      message: '[1/2] code',
    });
  });

  it('engine formats enricher with zero detected files', () => {
    const { tracker, computeInstructions } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    enricher.setDetectedFileCount(0);

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: '[1/1] code · 0 files detected',
    });
  });

  it('engine formats nx graph child step sub-lines in display', () => {
    const { tracker, computeInstructions } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'nx' });
    enricher.createChildStep('loading nx graph');
    enricher.setDetectedFileCount(3);

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: `\
[1/1] nx · 3 files detected
| loading nx graph`,
    });
  });

  it('engine formats enricher status message in display', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'package-manager' })
      .done('pnpm detected (good choice 😉)');

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerStop',
      message: '[1/1] package-manager · pnpm detected (good choice 😉)',
    });
  });

  it('engine formats status message as suffix alongside file count', () => {
    const { tracker, computeInstructions } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    enricher.setDetectedFileCount(5);
    enricher.done('scanned');

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerStop',
      message: '[1/1] code · 5 files detected · scanned',
    });
  });

  it('engine formats activity status message in display', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginTransforming({ transformCount: 0 })
      .createActivityStep('pnpm add -D vitest')
      .done('succeeded');

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerStop',
      message: 'pnpm add -D vitest · succeeded',
    });
  });

  it('engine formats activity child step sub-lines in display', () => {
    const { tracker, computeInstructions } = setUp();

    const activity = tracker
      .beginTransforming({ transformCount: 0 })
      .createActivityStep('Verifying');
    activity
      .createChildStep(
        'npx vitest run --reporter=json --config vitest.config.mts · cwd apps/my-app',
      )
      .done();

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: `\
Verifying
| npx vitest run --reporter=json --config vitest.config.mts · cwd apps/my-app`,
    });
  });

  it('engine formats heuristic step display with numbered prefix', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginAnalysis({ heuristicsCount: 2 })
      .createHeuristicStep({ name: 'angular' });

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerStart',
      message: '[1/2] angular',
    });
  });

  it('engine formats child transform progress in display', () => {
    const { tracker, computeInstructions } = setUp();

    const transforming = tracker.beginTransforming({ transformCount: 1 });
    const jestTest = transforming.createTransformStep({ name: 'jest-test' });
    jestTest
      .createChildTransform({ name: 'jest-mock' })
      .setTransformedFileCount(3);

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: `\
[1/1] jest-test · 3 files transformed
| jest-mock · 3 files transformed`,
    });
  });

  it('engine formats leaf transform file count in display', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginTransforming({ transformCount: 2 })
      .createTransformStep({ name: 'setup-files' })
      .setTransformedFileCount(4);

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: '[1/2] setup-files · 4 files transformed',
    });
  });

  it('engine formats transform with zero transformed files', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'setup-files' })
      .setTransformedFileCount(0);

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: '[1/1] setup-files · 0 files transformed',
    });
  });

  it('engine omits transform file count when unset', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'setup-files' });

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerStart',
      message: '[1/1] setup-files',
    });
  });

  it('engine formats transform group with rolled-up file count in display', () => {
    const { tracker, computeInstructions } = setUp();

    const jestTest = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' });
    jestTest
      .createChildTransform({ name: 'jest-mock' })
      .setTransformedFileCount(3);
    jestTest
      .createChildTransform({ name: 'jest-fn' })
      .setTransformedFileCount(7);

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: `\
[1/1] jest-test · 10 files transformed
| jest-mock · 3 files transformed
| jest-fn · 7 files transformed`,
    });
  });
});

function setUp() {
  const tracker = new ProgressTracker();
  const snapshots: ProgressSnapshot[] = [];
  tracker.snapshot$.subscribe((snapshot) => snapshots.push(snapshot));

  return {
    tracker,
    computeInstructions: () => _computeInstructions(snapshots),
  };
}

function _computeInstructions(
  snapshots: readonly ProgressSnapshot[],
): TerminalProgressInstruction[] {
  const engine = new TerminalProgressEngine();

  return snapshots.reduce<{
    previous: ProgressSnapshot | null;
    instructions: TerminalProgressInstruction[];
  }>(
    (state, next) => ({
      previous: next,
      instructions: [
        ...state.instructions,
        ...engine.computeInstructions(state.previous, next),
      ],
    }),
    { previous: null, instructions: [] },
  ).instructions;
}
