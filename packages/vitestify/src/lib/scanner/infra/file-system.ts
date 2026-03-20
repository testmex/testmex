import type { RelativePath } from '../core.js';

/**
 * File system abstraction used by the scanner.
 */
export class FileSystem {
  async scanDirectory(path: RelativePath): Promise<RelativePath[]> {
    throw new Error('🚧 Work in progress!');
  }
}
