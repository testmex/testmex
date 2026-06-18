import type { Change } from '../core/change';
import type { RelativePath } from '../core/relative-path';

export interface VitestifyOptions {
  path?: RelativePath;
}

/**
 * @deprecated 🚧 work in progress
 */
export class Vitestify {
  /**
   * @deprecated 🚧 work in progress
   */
  async run(_options: VitestifyOptions): Promise<void> {
    throw new Error('🚧 work in progress');
  }
}
