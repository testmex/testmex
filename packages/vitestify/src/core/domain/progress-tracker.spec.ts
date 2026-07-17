import { describe, expect, it } from 'vitest';
import type { ProgressSnapshot } from '../models/progress-snapshot';
import { ProgressTracker } from './progress-tracker';

describe(ProgressTracker, () => {
  it('emits immutable snapshots on mutation', () => {
    const tracker = new ProgressTracker();
    const snapshots: ProgressSnapshot[] = [];
    tracker.subscribe((snapshot) => snapshots.push(snapshot));

    const phase = tracker.beginScanning({ enricherCount: 2 });
    const enricher = phase.createEnricherStep({ name: 'code' });
    const priorSnapshot = snapshots[snapshots.length - 1];
    enricher.setFilesDetected(5);

    expect(snapshots[0]).not.toBe(snapshots[snapshots.length - 1]);
    expect(priorSnapshot.phases[0].steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 0,
    });
  });

  it('records typed phase and step snapshots', () => {
    const tracker = new ProgressTracker();

    const scanning = tracker.beginScanning({ enricherCount: 1 });
    scanning.createEnricherStep({ name: 'code' });
    scanning.done();

    const analysis = tracker.beginAnalysis({ heuristicsCount: 1 });
    analysis.createHeuristicStep({ name: 'jest' });
    analysis.done();

    const transforming = tracker.beginTransforming({ transformCount: 1 });
    transforming.createTransformStep({ name: 'jest-test' });
    transforming.done();

    const phases = tracker.snapshot().phases;
    expect.soft(phases.map((phase) => phase.kind)).toEqual([
      'scanning',
      'analysis',
      'transforming',
    ]);
    expect.soft(phases[0]).toMatchObject({ kind: 'scanning', enricherCount: 1 });
    expect.soft(phases[0].steps[0]).toMatchObject({ kind: 'enricher' });
    expect.soft(phases[1]).toMatchObject({ kind: 'analysis', heuristicsCount: 1 });
    expect.soft(phases[1].steps[0]).toMatchObject({ kind: 'heuristic' });
    expect.soft(phases[2]).toMatchObject({ kind: 'transforming', transformCount: 1 });
    expect.soft(phases[2].steps[0]).toMatchObject({ kind: 'transform' });
  });

  it('nested child transforms and activities', () => {
    const tracker = new ProgressTracker();

    const transforming = tracker.beginTransforming({ transformCount: 1 });
    const jestTest = transforming.createTransformStep({ name: 'jest-test' });
    const jestMock = jestTest.createChildTransform({ name: 'jest-mock' });
    const jestFn = jestTest.createChildTransform({ name: 'jest-fn' });
    jestMock.setTransformedFileCount(3);
    jestFn.setTransformedFileCount(7);

    const scanning = tracker.beginScanning({ enricherCount: 1 });
    const nx = scanning.createEnricherStep({ name: 'nx' });
    const activity = nx.createActivityStep('loading nx graph');
    activity.updateMessage('loading nx graph');

    const snapshot = tracker.snapshot();
    const transformStep = snapshot.phases
      .find((phase) => phase.kind === 'transforming')
      ?.steps.find((step) => step.kind === 'transform' && step.name === 'jest-test');
    expect.soft(transformStep).toMatchObject({
      kind: 'transform',
      name: 'jest-test',
      childTransforms: [
        { name: 'jest-mock', transformedFileCount: 3 },
        { name: 'jest-fn', transformedFileCount: 7 },
      ],
    });

    const enricherStep = snapshot.phases
      .find((phase) => phase.kind === 'scanning')
      ?.steps.find((step) => step.kind === 'enricher' && step.name === 'nx');
    expect.soft(enricherStep).toMatchObject({
      kind: 'enricher',
      activities: [{ kind: 'activity', message: 'loading nx graph' }],
    });
  });
});
