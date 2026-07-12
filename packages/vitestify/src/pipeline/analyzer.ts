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
    const total = this._heuristics.length;
    const spinner = this._progressReporter.createSpinner();

    for (const [index, heuristic] of this._heuristics.entries()) {
      spinner.message(`Analyzing [${index + 1}/${total}] ${heuristic.name}`);
      workspace.applyHeuristicResults(await heuristic.inspect(workspace.asReadonly()));
    }

    spinner.done(`Analyzed ${total} heuristics`);
  }
}
