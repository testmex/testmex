import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFakeTimers } from '../../testing/fake-timers';
import { ProgressReporterFake } from './progress-reporter.fake';
import { ThrottledProgressReporter } from './throttled-progress-reporter';

describe(ThrottledProgressReporter, () => {
  beforeEach(() => {
    useFakeTimers();
  });

  it.todo('throttled progress reporter keeps pending update until interval elapses', () => {
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { intervalMs: 100 });

    const spinner = reporter.createSpinner();
    spinner.update('1/5');
    vi.advanceTimersByTime(90);
    spinner.update('2/5');

    expect(inner.message()).toBe('1/5');
  });

  it.todo('throttled progress reporter forwards pending update after interval elapses', () => {
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { intervalMs: 100 });

    const spinner = reporter.createSpinner();
    spinner.update('1/5');
    vi.advanceTimersByTime(90);
    spinner.update('2/5');
    vi.advanceTimersByTime(10);

    expect(inner.message()).toBe('2/5');
  });

  it.todo('throttled progress reporter flushes on done', () => {
    const inner = new ProgressReporterFake();
    const reporter = new ThrottledProgressReporter(inner, { intervalMs: 100 });

    const spinner = reporter.createSpinner();
    spinner.update('count: 99');
    spinner.done('count: 99');

    expect.soft(inner.updates().at(-1)).toBe('count: 99');
    expect.soft(inner.doneMessage()).toBe('count: 99');
  });
});
