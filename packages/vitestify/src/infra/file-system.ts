import type { RelativePath } from '../core/relative-path';

/**
 * File system abstraction used by the scanner.
 */
export class FileSystem {
  /**
   * Returns file content or undefined if file is not found.
   */
  async maybeReadFile(path: RelativePath): Promise<string | null> {
    throw new Error('🚧 Work in progress!');
  }

  async scanDirectory(path: RelativePath): Promise<RelativePath[]> {
    throw new Error('🚧 Work in progress!');
  }
}
