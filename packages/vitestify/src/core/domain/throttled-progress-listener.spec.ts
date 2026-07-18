import { describe, expect, it, vi } from 'vitest';
import {
  ProgressTracker,
  type ProgressSnapshot,
} from '../models/progress-tracker';
import type { ProgressListener } from '../ports/progress-listener';
import { useFakeTimers } from '../../testing/fake-timers';
import { ThrottledProgressListener } from './throttled-progress-listener';

describe(ThrottledProgressListener, () => {
  it.todo('throttle files detected', async () => {
    useFakeTimers();
    const inner = _createInnerListener();
    const throttled = new ThrottledProgressListener(inner.listener, {
      duration: 100,
    });
    const tracker = new ProgressTracker();

    throttled.attach(tracker);

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    enricher.setDetectedFileCount(1);
    await vi.advanceTimersByTimeAsync(90);
    enricher.setDetectedFileCount(2);

    expect(inner.snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 1,
    });
  });

  it.todo('throttle transformed file count', async () => {
    useFakeTimers();
    const inner = _createInnerListener();
    const throttled = new ThrottledProgressListener(inner.listener, {
      duration: 100,
    });
    const tracker = new ProgressTracker();

    throttled.attach(tracker);

    const transform = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' });
    transform.setTransformedFileCount(1);
    await vi.advanceTimersByTimeAsync(90);
    transform.setTransformedFileCount(2);

    expect(inner.snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      transformedFileCount: 1,
    });
  });

  it.todo('passes through non-file-count updates immediately', () => {
    // Emit snapshot changes for activity `message`, `status` transition, or `done` / `fail`.
    // Assert inner listener is called on every emission without throttling.
  });

  it.todo('flushes latest file count on done', () => {
    // Rapid file-count updates then immediate `done` before interval elapses.
    // Assert inner listener renders final file count.
  });
});

function _createInnerListener() {
  const snapshots: ProgressSnapshot[] = [];
  const listener: ProgressListener = {
    attach(tracker: ProgressTracker) {
      return tracker.subscribe((snapshot) => {
        snapshots.push(snapshot);
      });
    },
  };

  return { listener, snapshots };
}
