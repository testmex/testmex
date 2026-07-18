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
    const tracker = new ProgressTracker();
    const snapshots: ProgressSnapshot[] = [];
    tracker.subscribe((snapshot) => snapshots.push(snapshot));

    const phase = tracker.beginScanning({ enricherCount: 1 });
    const enricher = phase.createEnricherStep({ name: 'code' });
    enricher.setFilesDetected(5);
    enricher.done();
    phase.done();

    const instructions = _computeInstructions(snapshots);

    expect(instructions).toEqual([
      { kind: 'intro', message: 'Scanning started' },
      { kind: 'spinnerStart', message: 'code' },
      { kind: 'spinnerStop', message: 'code' },
      { kind: 'outro', message: 'Scanning finished' },
    ]);
  });

  it.todo('engine formats step display strings', () => {
    // Diff snapshots where enricher `detectedFileCount`, nested `activities`, or transform `childTransforms` change.
    // Assert `spinnerStart` / `spinnerMessage` instructions carry expected display strings (numbered prefix, `| …` sub-lines).
  });
});

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
