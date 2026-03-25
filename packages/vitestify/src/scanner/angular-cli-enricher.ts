import { relativePath } from '../core/relative-path';
import {
  mergeWorkspaceInfo,
  type Project,
  WorkspaceInfo,
} from '../core/workspace-info';
import { FileSystem } from '../infra/file-system';
import { Enricher } from './enricher';

export class AngularCliEnricher implements Enricher {
  constructor(private _fileSystem: FileSystem) {}

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
