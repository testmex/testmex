import { describe, expect, it } from 'vitest';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { defineHeuristic } from '../core/models/heuristic';
import { ProgressTracker } from '../core/models/progress-tracker';
import { FileSystemFake } from '../core/ports/file-system.fake';
import { Analyzer } from './analyzer';

describe(Analyzer, () => {
  it('records heuristic steps per heuristic', async () => {
    const heuristics = [
      defineHeuristic({
        name: 'heuristic-a',
        inspect: async () => ({ findings: [] }),
      }),
      defineHeuristic({
        name: 'heuristic-b',
        inspect: async () => ({ findings: [] }),
      }),
    ];
    const progressTracker = new ProgressTracker();
    const analyzer = new Analyzer({ heuristics, progressTracker });
    const workspace = new Workspace({
      tree: new Tree({ fileSystem: new FileSystemFake() }),
    });

    await analyzer.analyze(workspace);

    const analysisPhase = progressTracker
      .snapshot()
      .phases.find((phase) => phase.kind === 'analysis');
    expect.soft(analysisPhase).toMatchObject({
      kind: 'analysis',
      heuristicsCount: 2,
      status: 'done',
    });
    expect.soft(analysisPhase?.steps).toMatchObject([
      { kind: 'heuristic', name: 'heuristic-a', status: 'done' },
      { kind: 'heuristic', name: 'heuristic-b', status: 'done' },
    ]);
    expect
      .soft(analysisPhase?.steps.every((step) => step.kind === 'heuristic'))
      .toBe(true);
  });
});
