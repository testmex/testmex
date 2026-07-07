import debug from 'debug';
import type { Workspace } from '../core/domain/workspace';
import type { Finding } from '../core/models/finding';
import type { Heuristic } from '../core/models/heuristic';

const log = debug('vitestify:analyzer');

export class Analyzer {
  private readonly _heuristics: Heuristic[];

  constructor({ heuristics }: { heuristics: Heuristic[] }) {
    this._heuristics = heuristics;
  }

  async analyze(workspace: Workspace): Promise<Finding[]> {
    log('running %d heuristics', this._heuristics.length);
    const findings: Finding[] = [];
    for (const [index, heuristic] of this._heuristics.entries()) {
      log('heuristic %d/%d', index + 1, this._heuristics.length);
      findings.push(...(await heuristic.inspect(workspace.asReadonly())));
    }
    log('discovered %d findings', findings.length);
    return findings;
  }
}
