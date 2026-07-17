import { describe, expect, it } from 'vitest';
import type { ProgressSnapshot } from '../models/progress-snapshot';
import { ProgressTracker } from './progress-tracker';

describe(ProgressTracker, () => {
  it.todo('emits immutable snapshots on mutation', () => {
    const tracker = new ProgressTracker();
    const snapshots: ProgressSnapshot[] = [];
    tracker.subscribe((snapshot) => snapshots.push(snapshot));

    const phase = tracker.beginScanning({ estimatedTotalSteps: 2 });
    const enricher = phase.createEnricherStep({
      name: 'code',
      stepNumber: 1,
      stepCount: 2,
    });
    const priorSnapshot = snapshots[snapshots.length - 1];
    enricher.setFilesDetected(5);

    expect(snapshots[0]).not.toBe(snapshots[snapshots.length - 1]);
    expect(priorSnapshot.phases[0].steps[0]).toMatchObject({
      kind: 'enricher',
      detectedFileCount: 0,
    });
  });

  it.todo('records typed phase and step snapshots', () => {
    const tracker = new ProgressTracker();

    const scanning = tracker.beginScanning({ estimatedTotalSteps: 1 });
    scanning.createEnricherStep({
      name: 'code',
      stepNumber: 1,
      stepCount: 1,
    });
    scanning.done();

    const analysis = tracker.beginAnalysis({ estimatedTotalSteps: 1 });
    analysis.createHeuristicStep({
      name: 'jest',
      stepNumber: 1,
      stepCount: 1,
    });
    analysis.done();

    const transforming = tracker.beginTransforming({ estimatedTotalSteps: 1 });
    transforming.createTransformStep({
      name: 'jest-test',
      stepNumber: 1,
      stepCount: 1,
    });
    transforming.done();

    const phases = tracker.snapshot().phases;
    expect.soft(phases.map((phase) => phase.kind)).toEqual([
      'scanning',
      'analysis',
      'transforming',
    ]);
    expect.soft(phases[0].estimatedTotalSteps).toBe(1);
    expect.soft(phases[0].steps[0]).toMatchObject({ kind: 'enricher' });
    expect.soft(phases[1].estimatedTotalSteps).toBe(1);
    expect.soft(phases[1].steps[0]).toMatchObject({ kind: 'heuristic' });
    expect.soft(phases[2].estimatedTotalSteps).toBe(1);
    expect.soft(phases[2].steps[0]).toMatchObject({ kind: 'transform' });
  });

  it.todo('nested child transforms and activities', () => {
    const tracker = new ProgressTracker();

    const transforming = tracker.beginTransforming({ estimatedTotalSteps: 1 });
    const jestTest = transforming.createTransformStep({
      name: 'jest-test',
      stepNumber: 1,
      stepCount: 1,
    });
    const jestMock = jestTest.createChildTransform({
      name: 'jest-mock',
      stepNumber: 1,
      stepCount: 2,
    });
    const jestFn = jestTest.createChildTransform({
      name: 'jest-fn',
      stepNumber: 2,
      stepCount: 2,
    });
    jestMock.setTransformedFileCount(3);
    jestFn.setTransformedFileCount(7);

    const scanning = tracker.beginScanning({ estimatedTotalSteps: 1 });
    const nx = scanning.createEnricherStep({
      name: 'nx',
      stepNumber: 1,
      stepCount: 1,
    });
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
