import { describe, expect, it, vi } from 'vitest';
import { useFakeTimers } from '../../testing/fake-timers';
import { LegacyProgressReporterFake } from '../ports/legacy-progress-reporter.fake';
import { LegacyThrottledProgressReporter } from './legacy-throttled-progress-reporter';

describe(LegacyThrottledProgressReporter, () => {
  it('throttled progress reporter keeps pending message until interval elapses', async () => {
    useFakeTimers();
    const inner = new LegacyProgressReporterFake();
    const legacyProgressReporter = new LegacyThrottledProgressReporter(inner, {
      duration: 100,
    });

    const phase = legacyProgressReporter.createPhase('test');
    const progressStep = phase.createStep({
      name: 'test',
      stepNumber: 1,
      stepCount: 5,
    });
    progressStep.updateMessage('started');
    await vi.advanceTimersByTimeAsync(90);
    progressStep.updateMessage('pending');

    expect(inner.phases()[0].steps[0].message).toBe('started');
  });

  it('throttled progress reporter forwards pending message after interval elapses', async () => {
    useFakeTimers();
    const inner = new LegacyProgressReporterFake();
    const legacyProgressReporter = new LegacyThrottledProgressReporter(inner, {
      duration: 100,
    });

    const phase = legacyProgressReporter.createPhase('test');
    const progressStep = phase.createStep({
      name: 'test',
      stepNumber: 1,
      stepCount: 5,
    });
    progressStep.updateMessage('started');
    await vi.advanceTimersByTimeAsync(90);
    progressStep.updateMessage('pending');
    await vi.advanceTimersByTimeAsync(10);

    expect(inner.phases()[0].steps[0].message).toBe('pending');
  });

  it('throttled progress reporter flushes on done', () => {
    useFakeTimers();
    const inner = new LegacyProgressReporterFake();
    const legacyProgressReporter = new LegacyThrottledProgressReporter(inner, {
      duration: 100,
    });

    const phase = legacyProgressReporter.createPhase('test');
    const progressStep = phase.createStep({
      name: 'test',
      stepNumber: 1,
      stepCount: 5,
    });
    progressStep.updateMessage('started');
    progressStep.done('completed');

    expect(inner.phases()[0].steps[0].message).toBe('completed');
  });
});
