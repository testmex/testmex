import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';
import type { ProgressTracker } from '../core/models/progress-tracker';

export class Analyzer {
  private readonly _heuristics: Heuristic[];
  private readonly _progressTracker: ProgressTracker;

  constructor({
    heuristics,
    progressTracker,
  }: {
    heuristics: Heuristic[];
    progressTracker: ProgressTracker;
  }) {
    this._heuristics = heuristics;
    this._progressTracker = progressTracker;
  }

  async analyze(workspace: Workspace): Promise<void> {
    const phase = this._progressTracker.beginAnalysis({
      heuristicsCount: this._heuristics.length,
    });

    for (const heuristic of this._heuristics) {
      const heuristicStep = phase.createHeuristicStep({ name: heuristic.name });
      workspace.applyHeuristicResults(
        await heuristic.inspect(workspace.asReadonly()),
      );
      heuristicStep.done();
    }

    phase.done();
  }
}
