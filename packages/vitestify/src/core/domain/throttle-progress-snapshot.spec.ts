import { describe, expect, it, vi } from 'vitest';
import {
  ProgressTracker,
  type ProgressSnapshot,
} from '../models/progress-tracker';
import { useFakeTimers } from '../../testing/fake-timers';
import { throttleProgressSnapshot } from './throttle-progress-snapshot';

describe(throttleProgressSnapshot, () => {
  it.todo('throttles detected file count updates', async () => {
    const { tracker, snapshots } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    enricher.setDetectedFileCount(1);
    await vi.advanceTimersByTimeAsync(90);
    enricher.setDetectedFileCount(2);

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 1,
    });
  });

  it.todo('throttles transformed file count updates', async () => {
    const { tracker, snapshots } = setUp();

    const transform = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' });
    transform.setTransformedFileCount(1);
    await vi.advanceTimersByTimeAsync(90);
    transform.setTransformedFileCount(2);

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      transformedFileCount: 1,
    });
  });

  it.todo('passes through non-file-count updates immediately', () => {
    // Emit snapshot changes for activity `message`, `status` transition, or `done` / `fail`.
    // Assert listener is called on every emission without throttling.
  });

  it.todo('flushes latest file count on done', () => {
    // Rapid file-count updates then immediate `done` before interval elapses.
    // Assert listener renders final file count.
  });
});

function setUp() {
  useFakeTimers();
  const tracker = new ProgressTracker();
  const snapshots: ProgressSnapshot[] = [];

  const sub = tracker.snapshot$
    .pipe(throttleProgressSnapshot(100))
    .subscribe((snapshot) => snapshots.push(snapshot));
  onTestFinished(() => sub.unsubscribe());

  return { tracker, snapshots };
}
