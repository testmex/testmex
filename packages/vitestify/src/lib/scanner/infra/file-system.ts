import type { RelativePath } from '../core.js';

/**
 * File system abstraction used by the scanner.
 */
export interface FileSystem {
  scanDirectory(path: RelativePath): RelativePath[];
}
