import { relativePath } from '../../core/relative-path';
import {
  mergeWorkspaceInfo,
  type Project,
  WorkspaceInfo,
} from '../../core/workspace-info';
import { Enricher } from '../../core/enricher';
import type { ReadonlyTree } from '../../core/tree';

export class AngularCliEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const angularJson = await this._tree.maybeReadFile(
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
