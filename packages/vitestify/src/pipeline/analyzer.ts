import debug from 'debug';
import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';

const log = debug('vitestify:analyzer');

export class Analyzer {
  private readonly _heuristics: Heuristic[];

  constructor({ heuristics }: { heuristics: Heuristic[] }) {
    this._heuristics = heuristics;
  }

  async analyze(workspace: Workspace): Promise<void> {
    log('running %d heuristics', this._heuristics.length);
    for (const [index, heuristic] of this._heuristics.entries()) {
      log('heuristic %d/%d', index + 1, this._heuristics.length);
      workspace.addFindings(
        await heuristic.inspect(workspace.asReadonly()),
      );
    }
    log('discovered %d findings', workspace.findings.length);
  }
}
