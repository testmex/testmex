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
    enricher.setFilesDetected(5);
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

  it('engine formats nx graph activity sub-lines in display', () => {
    const { tracker, computeInstructions } = setUp();

    tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'nx' })
      .createActivityStep('loading nx graph');

    const instructions = computeInstructions();

    expect(instructions.at(-1)).toEqual({
      kind: 'spinnerMessage',
      message: `\
nx
| loading nx graph`,
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
      message: `jest-test
| jest-mock · 3 files transformed`,
    });
  });

  it.todo(
    'engine formats transform group with rolled-up file count in display',
    () => {
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
        message: `jest-test · 10 files transformed
| jest-mock · 3 files transformed
| jest-fn · 7 files transformed`,
      });
    },
  );
});

function setUp() {
  const tracker = new ProgressTracker();
  const snapshots: ProgressSnapshot[] = [];
  tracker.subscribe((snapshot) => snapshots.push(snapshot));

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
