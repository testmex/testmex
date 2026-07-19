import { describe, expect, it } from 'vitest';
import { defineHeuristic } from '../core/models/heuristic';
import { ProgressTracker } from '../core/models/progress-tracker';
import {
  createTestingWorkspace,
  WorkspaceMother,
} from '../core/models/workspace.mother';
import { Analyzer } from './analyzer';

describe(Analyzer.name, () => {
  it.todo('records heuristic steps per heuristic', async () => {
    const progressTracker = new ProgressTracker();
    const heuristics = [
      defineHeuristic({ name: 'jest', inspect: async () => ({ findings: [] }) }),
      defineHeuristic({
        name: 'react',
        inspect: async () => ({ findings: [] }),
      }),
    ];
    const analyzer = new Analyzer({ heuristics, progressTracker });
    const workspace = createTestingWorkspace(WorkspaceMother.withApp('my-app'));

    await analyzer.analyze(workspace);

    const analysisPhase = progressTracker
      .snapshot()
      .phases.find((phase) => phase.kind === 'analysis');
    expect.soft(analysisPhase).toMatchObject({
      kind: 'analysis',
      heuristicsCount: 2,
      status: 'done',
    });
    expect.soft(analysisPhase?.steps).toEqual([
      { kind: 'heuristic', name: 'jest', status: 'done' },
      { kind: 'heuristic', name: 'react', status: 'done' },
    ]);
  });
});
