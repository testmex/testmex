import { findingType, type Finding } from '../../core/finding';
import type { Heuristic } from '../../core/heuristic';
import type { Workspace } from '../../core/workspace';

export const jestMockCallFindingType = findingType('jest-mock-call');

/**
 * @deprecated 🚧 work in progress
 */
export const jestMockHeuristic: Heuristic = {
  /**
   * @deprecated 🚧 work in progress
   */
  inspect: async (workspace: Workspace): Promise<Finding[]> => {
    throw new Error('🚧 work in progress');
  },
};
