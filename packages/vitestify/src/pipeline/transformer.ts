import debug from 'debug';
import type { Workspace } from '../core/domain/workspace';
import type { Finding } from '../core/models/finding';
import type { Transform } from '../core/models/transform';

const log = debug('vitestify:transformer');

export class Transformer {
  private readonly _transforms: Transform[];

  constructor({ transforms }: { transforms: Transform[] }) {
    this._transforms = transforms;
  }

  async transform({
    findings,
    workspace,
  }: {
    findings: Finding[];
    workspace: Workspace;
  }): Promise<void> {
    log('running %d transforms', this._transforms.length);
    for (const [index, transform] of this._transforms.entries()) {
      log('transform %d/%d', index + 1, this._transforms.length);
      await transform.apply({ findings, workspace });
    }

    log('committing workspace tree');
    await workspace.tree.commit();
    log('done');
  }
}
