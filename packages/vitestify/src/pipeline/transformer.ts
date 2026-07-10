import debug from 'debug';
import type { Workspace } from '../core/domain/workspace';
import type { Transform } from '../core/models/transform';
import { NullProgressReporter } from '../core/ports/null-progress-reporter';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const log = debug('vitestify:transformer');

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
    log('running %d transforms', this._transforms.length);
    for (const [index, transform] of this._transforms.entries()) {
      log('transform %d/%d', index + 1, this._transforms.length);
      await transform.apply(workspace);
    }

    log('committing workspace tree');
    await workspace.tree.commit();
    log('done');
  }
}
