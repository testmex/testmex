import type { RelativePath } from '../core/relative-path';
import type { ProjectFile, WorkspaceInfo } from '../core/workspace-info';
import { FileSystem } from '../infra/file-system';
import { Enricher } from './enricher';

/**
 * @deprecated 🚧 work in progress
 */
export class TestEnricher implements Enricher {
  private readonly _fileSystem: FileSystem;

  constructor({ fileSystem }: { fileSystem: FileSystem }) {
    this._fileSystem = fileSystem;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    return workspaceInfo;
  }

  /**
   * @deprecated 🚧 work in progress
   */
  private async _discoverTestFiles(
    projectRoot: RelativePath,
  ): Promise<ProjectFile[]> {
    throw new Error('🚧 work in progress');
  }
}
