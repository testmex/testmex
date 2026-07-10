import { describe, it } from 'vitest';

describe('ProgressReporter', () => {
  it.todo('progress reporter fake records spinner lifecycle', () => {
    // Create a `ProgressReporterFake`.
    // Call `createSpinner()`, then `update('step 1')`, `update('step 2')`, `done('finished')`.
    // Assert recorded updates are `['step 1', 'step 2']` and done message is `'finished'`.
  });

  it.todo('throttled progress reporter drops rapid updates', () => {
    // Wrap a `ProgressReporterFake` with `ThrottledProgressReporter({ intervalMs: 100 })`.
    // Call `update` 10 times within 50ms.
    // Assert inner fake received fewer than 10 updates.
  });

  it.todo('throttled progress reporter flushes on done', () => {
    // Wrap a `ProgressReporterFake` with `ThrottledProgressReporter({ intervalMs: 100 })`.
    // Call `update('count: 99')` then immediately `done('count: 99')`.
    // Assert inner fake's last update is `'count: 99'` and done message is `'count: 99'`.
  });
});
