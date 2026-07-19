import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { useFakeTimers } from '../../testing/fake-timers';
import {
  ProgressTracker,
  type ProgressSnapshot,
} from '../models/progress-tracker';
import { throttleProgressSnapshot } from './throttle-progress-snapshot';

describe(throttleProgressSnapshot, () => {
  it('throttles detected file count updates', async () => {
    const { tracker, snapshots } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    await vi.advanceTimersByTimeAsync(90);
    enricher.setDetectedFileCount(1);

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 0,
    });
  });

  it('flushes detected file count after throttle window elapses', async () => {
    const { tracker, snapshots } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    enricher.setDetectedFileCount(1);
    await vi.advanceTimersByTimeAsync(110);

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 1,
    });
  });

  it('flushes detected file count on done', async () => {
    const { tracker, snapshots } = setUp();

    const enricher = tracker
      .beginScanning({ enricherCount: 1 })
      .createEnricherStep({ name: 'code' });
    await vi.advanceTimersByTimeAsync(90);
    enricher.setDetectedFileCount(1);
    enricher.done('scanned');

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 1,
    });
  });

  it('throttles transformed file count updates', async () => {
    const { tracker, snapshots } = setUp();

    const transform = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' });
    await vi.advanceTimersByTimeAsync(90);
    transform.setTransformedFileCount(1);

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      transformedFileCount: 0,
    });
  });

  it('flushes transformed file count on done', async () => {
    const { tracker, snapshots } = setUp();

    const transform = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' });
    await vi.advanceTimersByTimeAsync(50);
    transform.setTransformedFileCount(1);
    transform.done('complete');

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      transformedFileCount: 1,
    });
  });

  it('throttles child transform file count updates', async () => {
    const { tracker, snapshots } = setUp();

    const child = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' })
      .createChildTransform({ name: 'jest-mock' });
    await vi.advanceTimersByTimeAsync(90);
    child.setTransformedFileCount(1);

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      name: 'jest-test',
      childTransforms: [
        { kind: 'transform', name: 'jest-mock', transformedFileCount: 0 },
      ],
    });
  });

  it('passes through new child transform immediately', () => {
    const { tracker, snapshots } = setUp();
    const transform = tracker
      .beginTransforming({ transformCount: 1 })
      .createTransformStep({ name: 'jest-test' });

    transform.createChildTransform({ name: 'jest-mock' }).done();
    transform.createChildTransform({ name: 'vi-imports' });

    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'transform',
      name: 'jest-test',
      childTransforms: [
        { kind: 'transform', name: 'jest-mock', transformedFileCount: 0 },
        { kind: 'transform', name: 'vi-imports', transformedFileCount: 0 },
      ],
    });
  });

  it('passes through new enricher step immediately', () => {
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

  it('passes through new heuristic step immediately', () => {
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

  it('passes through new transform step immediately', () => {
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

  it('passes through new activity step immediately', () => {
    const { tracker, snapshots } = setUp();
    const transforming = tracker.beginTransforming({ transformCount: 1 });
    const baseline = snapshots.length;

    transforming.createActivityStep('working');

    expect(snapshots.length).toBe(baseline + 1);
    expect(snapshots.at(-1)?.phases[0]?.steps[0]).toMatchObject({
      kind: 'activity',
    });
  });

  it('passes through new enricher activity immediately', () => {
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

  it('passes through enricher activity done immediately', () => {
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

  it('passes through enricher step done immediately', () => {
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

  it('passes through enricher step fail immediately', () => {
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
