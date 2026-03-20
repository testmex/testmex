import type { RelativePath } from '../../core/core';

/**
 * File system abstraction used by the scanner.
 */
export class FileSystem {
  async scanDirectory(path: RelativePath): Promise<RelativePath[]> {
    throw new Error('🚧 Work in progress!');
  }
}
