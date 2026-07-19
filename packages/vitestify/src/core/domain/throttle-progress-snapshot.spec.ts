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

  it.todo('flushes detected file count on done', async () => {
    const { tracker, snapshots } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    enricher.setDetectedFileCount(1);
    await vi.advanceTimersByTimeAsync(50);
    enricher.setDetectedFileCount(2);
    enricher.done('scanned');

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 2,
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

  it.todo('flushes transformed file count on done', async () => {
    const { tracker, snapshots } = setUp();

    const transform = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' });
    transform.setTransformedFileCount(1);
    await vi.advanceTimersByTimeAsync(50);
    transform.setTransformedFileCount(2);
    transform.done('complete');

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      transformedFileCount: 2,
    });
  });

  it.todo('throttles child transform file count updates', async () => {
    const { tracker, snapshots } = setUp();

    const child = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' })
      .createChildTransform({ name: 'jest-mock' });
    child.setTransformedFileCount(1);
    await vi.advanceTimersByTimeAsync(90);
    child.setTransformedFileCount(2);

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      name: 'jest-test',
      childTransforms: [
        { kind: 'transform', name: 'jest-mock', transformedFileCount: 1 },
      ],
    });
  });

  it.todo('passes through new enricher step immediately', () => {
    const { tracker, snapshots } = setUp();
    const scanning = tracker.beginScanning({ enricherCount: 1 });
    const baseline = snapshots.length;

    scanning.createEnricherStep({ name: 'nx' });

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      name: 'nx',
    });
  });

  it.todo('passes through new heuristic step immediately', () => {
    const { tracker, snapshots } = setUp();
    const analysis = tracker.beginAnalysis({ heuristicsCount: 1 });
    const baseline = snapshots.length;

    analysis.createHeuristicStep({ name: 'jest' });

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'heuristic',
      name: 'jest',
    });
  });

  it.todo('passes through new transform step immediately', () => {
    const { tracker, snapshots } = setUp();
    const transforming = tracker.beginTransforming({ transformCount: 1 });
    const baseline = snapshots.length;

    transforming.createTransformStep({ name: 'jest-test' });

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      name: 'jest-test',
    });
  });

  it.todo('passes through new activity step immediately', () => {
    const { tracker, snapshots } = setUp();
    const transforming = tracker.beginTransforming({ transformCount: 1 });
    const baseline = snapshots.length;

    transforming.createActivityStep();

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'activity',
    });
  });

  it.todo('passes through new enricher activity immediately', () => {
    const { tracker, snapshots } = setUp();
    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'nx' });
    const baseline = snapshots.length;

    enricher.createActivityStep('loading nx graph');

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      activities: [{ kind: 'activity', message: 'loading nx graph' }],
    });
  });

  it.todo('passes through enricher activity done immediately', () => {
    const { tracker, snapshots } = setUp();
    const activity = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'nx' })
      .createActivityStep('loading nx graph');
    const baseline = snapshots.length;

    activity.done();

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      activities: [{ kind: 'activity', status: 'done' }],
    });
  });

  it.todo('passes through enricher step done immediately', () => {
    const { tracker, snapshots } = setUp();
    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'nx' });
    const baseline = snapshots.length;

    enricher.done('scanned');

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      status: 'done',
      statusMessage: 'scanned',
    });
  });

  it.todo('passes through enricher step fail immediately', () => {
    const { tracker, snapshots } = setUp();
    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'nx' });
    const baseline = snapshots.length;

    enricher.fail('scan failed');

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      status: 'failed',
      statusMessage: 'scan failed',
    });
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
