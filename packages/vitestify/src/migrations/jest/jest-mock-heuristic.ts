import type { Finding } from '../../core/finding';
import type { Heuristic } from '../../core/heuristic';
import type { Workspace } from '../../core/workspace';

/**
 * @deprecated 🚧 work in progress
 */
export class JestMockHeuristic implements Heuristic {
  /**
   * @deprecated 🚧 work in progress
   */
  async inspect(workspace: Workspace): Promise<Finding[]> {
    throw new Error('🚧 work in progress');
  }
}
