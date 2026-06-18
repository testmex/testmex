import { relativePath } from '../../core/relative-path';
import {
  mergeWorkspaceInfo,
  type Project,
  WorkspaceInfo,
} from '../../core/workspace-info';
import { FileSystem } from '../../infra/file-system';
import { Enricher } from '../../scanner/enricher';

export class AngularCliEnricher implements Enricher {
  private readonly _fileSystem: FileSystem;

  constructor({ fileSystem }: { fileSystem: FileSystem }) {
    this._fileSystem = fileSystem;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const angularJson = await this._fileSystem.maybeReadFile(
      relativePath('angular.json'),
    );

    if (angularJson === null) {
      return workspaceInfo;
    }

    const config: AngularJson = JSON.parse(angularJson);

    const projects: Project[] = Object.entries(config.projects ?? {}).map(
      ([name, meta]) => ({
        name,
        path: relativePath(meta.root),
        files: [],
      }),
    );

    return mergeWorkspaceInfo(workspaceInfo, {
      workspaceType: 'angular-cli',
      projects,
    });
  }
}

interface AngularJson {
  projects?: Record<string, { root: string }>;
}
