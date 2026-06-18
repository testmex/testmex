import type { Finding } from '../core/finding';
import type { Workspace } from '../core/workspace';
import type { Heuristic } from '../core/heuristic';

/**
 * @deprecated 🚧 work in progress
 */
export class Analyzer {
  /**
   * @deprecated 🚧 work in progress
   */
  async analyze(
    workspace: Workspace,
    heuristics: Heuristic[],
  ): Promise<Finding[]> {
    throw new Error('🚧 work in progress');
  }
}
