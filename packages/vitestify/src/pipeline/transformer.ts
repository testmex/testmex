import type { Workspace } from '../core/domain/workspace';
import type { Transform } from '../core/models/transform';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

export class Transformer {
  private readonly _progressReporter: ProgressReporter;
  private readonly _transforms: Transform[];

  constructor({
    transforms,
    progressReporter = new NullProgressReporter(),
  }: {
    transforms: Transform[];
    progressReporter?: ProgressReporter;
  }) {
    this._progressReporter = progressReporter;
    this._transforms = transforms;
  }

  async transform(workspace: Workspace): Promise<void> {
    for (const [index, transform] of this._transforms.entries()) {
      const step = index + 1;
      const total = this._transforms.length;
      const spinner = this._progressReporter.createSpinner();
      spinner.message(`Transforming [${step}/${total}] ${transform.name}`);
      await transform.apply(workspace);
      spinner.done(`Transformed  [${step}/${total}] ${transform.name}`);
    }

    await workspace.tree.commit();
  }
}
