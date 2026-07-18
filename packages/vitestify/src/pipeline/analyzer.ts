import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';
import { LegacyNullProgressReporter } from '../core/ports/legacy-null-progress-reporter';
import type { LegacyProgressReporter } from '../core/ports/legacy-progress-reporter';

export class Analyzer {
  private readonly _heuristics: Heuristic[];
  private readonly _legacyProgressReporter: LegacyProgressReporter;

  constructor({
    heuristics,
    legacyProgressReporter = new LegacyNullProgressReporter(),
  }: {
    heuristics: Heuristic[];
    legacyProgressReporter?: LegacyProgressReporter;
  }) {
    this._heuristics = heuristics;
    this._legacyProgressReporter = legacyProgressReporter;
  }

  async analyze(workspace: Workspace): Promise<void> {
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
