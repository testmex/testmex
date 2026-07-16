import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

export class Analyzer {
  private readonly _heuristics: Heuristic[];
  private readonly _progressReporter: ProgressReporter;

  constructor({
    heuristics,
    progressReporter = new NullProgressReporter(),
  }: {
    heuristics: Heuristic[];
    progressReporter?: ProgressReporter;
  }) {
    this._heuristics = heuristics;
    this._progressReporter = progressReporter;
  }

  async analyze(workspace: Workspace): Promise<void> {
    const stepCount = this._heuristics.length;
    const phase = this._progressReporter.createPhase('Workspace analysis');

    for (const [index, heuristic] of this._heuristics.entries()) {
      const progressStep = phase.createStep({
        name: heuristic.name,
        stepNumber: index + 1,
        stepCount,
      });

      progressStep.updateMessage('analyzing');
      workspace.applyHeuristicResults(
        await heuristic.inspect(workspace.asReadonly()),
      );
      progressStep.done('analyzed');
    }

    phase.done();
  }
}
