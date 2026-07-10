import { describe, it } from 'vitest';
import { ThrottledProgressReporter } from './throttled-progress-reporter';

describe(ThrottledProgressReporter, () => {
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
