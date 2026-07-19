import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';
import type { ProgressTracker } from '../core/models/progress-tracker';
import { LegacyNullProgressReporter } from '../core/ports/legacy-null-progress-reporter';
import type { LegacyProgressReporter } from '../core/ports/legacy-progress-reporter';

export class Analyzer {
  private readonly _heuristics: Heuristic[];
  private readonly _legacyProgressReporter: LegacyProgressReporter;
  private readonly _progressTracker?: ProgressTracker;

  constructor({
    heuristics,
    legacyProgressReporter = new LegacyNullProgressReporter(),
    progressTracker,
  }: {
    heuristics: Heuristic[];
    legacyProgressReporter?: LegacyProgressReporter;
    progressTracker?: ProgressTracker;
  }) {
    this._heuristics = heuristics;
    this._legacyProgressReporter = legacyProgressReporter;
    this._progressTracker = progressTracker;
  }

  async analyze(workspace: Workspace): Promise<void> {
    if (this._progressTracker !== undefined) {
      return this._analyzeWithProgressTracker(workspace, this._progressTracker);
    }

    return this._analyzeWithLegacyProgressReporter(workspace);
  }

  private async _analyzeWithProgressTracker(
    workspace: Workspace,
    progressTracker: ProgressTracker,
  ): Promise<void> {
    const phase = progressTracker.beginAnalysis({
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

  private async _analyzeWithLegacyProgressReporter(
    workspace: Workspace,
  ): Promise<void> {
    const stepCount = this._heuristics.length;
    const phase = this._legacyProgressReporter.createPhase('Workspace analysis');

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
