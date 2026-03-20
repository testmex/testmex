import type { FileSystem } from './infra/file-system';
import type { WorkspaceInfo } from '../core/core';

/**
 * @deprecated 🚧 work in progress
 */
export class Scanner {
  constructor(private readonly _fileSystem: FileSystem) {}

  /**
   * @deprecated 🚧 work in progress
   */
  async scanWorkspace(): Promise<WorkspaceInfo> {
    throw new Error('🚧 work in progress');
  }
}
