import { describe, it } from 'vitest';
import { TerminalProgressListener } from './terminal-progress-listener';

describe(TerminalProgressListener, () => {
  it.todo('attaches to snapshot updates', () => {
    // Create a `ProgressTracker` and mock clack `spinner` / `intro` / `outro`.
    // `attach(tracker)` and mutate tracker (begin phase, create step, `done`).
    // Assert inner clack methods called in response to snapshot emissions.
  });
});

describe('formatStepDisplay', () => {
  it.todo('formats step display strings', () => {
    // Call format helpers with typed snapshot fields (enricher `detectedFileCount`, nested activities, transform `childTransforms`).
    // Assert expected display strings (numbered prefix, `| …` sub-lines).
  });
});
