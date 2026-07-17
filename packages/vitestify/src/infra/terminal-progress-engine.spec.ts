import { describe, it } from 'vitest';
import { TerminalProgressEngine } from './terminal-progress-engine';

describe(TerminalProgressEngine, () => {
  it.todo('engine diffs snapshots to instructions', () => {
    // Build `previous` and `next` `ProgressSnapshot` fixtures (or mutate a `ProgressTracker` and capture consecutive snapshots).
    // Call `engine.diff(previous, next)`.
    // Assert instruction sequence: e.g. `intro` on phase start, `spinnerStart` on new step, `spinnerMessage` on file-count change, `spinnerStop` + `outro` on phase `done`.
  });

  it.todo('engine formats step display strings', () => {
    // Diff snapshots where enricher `detectedFileCount`, nested `activities`, or transform `childTransforms` change.
    // Assert `spinnerStart` / `spinnerMessage` instructions carry expected display strings (numbered prefix, `| …` sub-lines).
  });
});
