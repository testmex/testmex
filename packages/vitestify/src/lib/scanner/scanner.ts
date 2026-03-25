import type { FileSystem } from './infra/file-system';
import { relativePath, type Project, type WorkspaceInfo } from '../core/core';

/**
 * @deprecated 🚧 work in progress
 */
export class Scanner {
  constructor(private readonly _fileSystem: FileSystem) {}

  /**
   * @deprecated 🚧 work in progress
   */
  async scanWorkspace(): Promise<WorkspaceInfo> {
    const angularJson = await this._fileSystem.maybeReadFile(
      relativePath('angular.json'),
    );
    if (angularJson == null) {
      throw new Error('Unsupported workspace');
    }

    const config = JSON.parse(angularJson) as {
      projects?: Record<string, { root: string }>;
    };

    const projects: Project[] = Object.entries(config.projects ?? {}).map(
      ([name, meta]) => ({
        name,
        path: relativePath(meta.root),
        files: [],
      }),
    );

    return {
      workspaceType: 'angular-cli',
      projects,
    };
  }
}
