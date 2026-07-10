import { describe, expect, it, vi } from 'vitest';
import { useFakeTimers } from '../../testing/fake-timers';
import { ProgressReporterFake } from './progress-reporter.fake';
import { ThrottledProgressReporter } from './throttled-progress-reporter';

describe(ThrottledProgressReporter, () => {
  it('throttled progress reporter keeps pending update until interval elapses', async () => {
    useFakeTimers();
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { duration: 100 });

    const spinner = reporter.createSpinner();
    spinner.update('1/5');
    await vi.advanceTimersByTimeAsync(90);
    spinner.update('2/5');

    expect(inner.message()).toBe('1/5');
  });

  it('throttled progress reporter forwards pending update after interval elapses', async () => {
    useFakeTimers();
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { duration: 100 });

    const spinner = reporter.createSpinner();
    spinner.update('1/5');
    await vi.advanceTimersByTimeAsync(90);
    spinner.update('2/5');
    await vi.advanceTimersByTimeAsync(10);

    expect(inner.message()).toBe('2/5');
  });

  it('throttled progress reporter flushes on done', () => {
    useFakeTimers();
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { duration: 100 });

    const spinner = reporter.createSpinner();
    spinner.update('1/5');
    spinner.done('5/5');

    expect(inner.message()).toBe('5/5');
  });
});
