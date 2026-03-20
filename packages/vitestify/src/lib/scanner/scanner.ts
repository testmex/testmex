import type { FileSystem } from './infra/file-system.js';
import type { WorkspaceInfo } from './core.js';

/**
 * @deprecated 🚧 work in progress
 */
export class Scanner {
  constructor(private readonly fileSystem: FileSystem) {}

  /**
   * @deprecated 🚧 work in progress
   */
  async scanWorkspace(): Promise<WorkspaceInfo> {
    throw new Error('🚧 work in progress');
  }
}
