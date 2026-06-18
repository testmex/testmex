import type { Finding } from '../../core/finding';
import type { Transform } from '../../core/transform';
import type { Tree } from '../../core/tree';

/**
 * @deprecated 🚧 work in progress
 */
export const jestMockTransform: Transform = {
  /**
   * @deprecated 🚧 work in progress
   */
  apply: async (
    _tree: Tree,
    _findings: Finding[],
  ): Promise<void> => {
    throw new Error('🚧 work in progress');
  },
};
