import { describe, expect, it, vi } from 'vitest';
import { useFakeTimers } from '../../testing/fake-timers';
import { ProgressReporterFake } from '../ports/progress-reporter.fake';
import { ThrottledProgressReporter } from './throttled-progress-reporter';

describe(ThrottledProgressReporter, () => {
  it('throttled progress reporter keeps pending message until interval elapses', async () => {
    useFakeTimers();
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { duration: 100 });

    const progressStep = reporter.createStep({
      name: 'test',
      stepNumber: 1,
      stepCount: 5,
    });
    progressStep.message('started');
    await vi.advanceTimersByTimeAsync(90);
    progressStep.message('pending');

    expect(inner.message()).toBe('[1/5] test · started');
  });

  it('throttled progress reporter forwards pending message after interval elapses', async () => {
    useFakeTimers();
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { duration: 100 });

    const progressStep = reporter.createStep({
      name: 'test',
      stepNumber: 1,
      stepCount: 5,
    });
    progressStep.message('started');
    await vi.advanceTimersByTimeAsync(90);
    progressStep.message('pending');
    await vi.advanceTimersByTimeAsync(10);

    expect(inner.message()).toBe('[1/5] test · pending');
  });

  it('throttled progress reporter flushes on done', () => {
    useFakeTimers();
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { duration: 100 });

    const progressStep = reporter.createStep({
      name: 'test',
      stepNumber: 1,
      stepCount: 5,
    });
    progressStep.message('started');
    progressStep.done('completed');

    expect(inner.message()).toBe('[1/5] test · completed');
  });
});
