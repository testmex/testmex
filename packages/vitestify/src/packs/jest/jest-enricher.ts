import { relative } from 'node:path/posix';
import type { RelativePath } from '../../core/models/relative-path';
import {
  type FileInfo,
  type WorkspaceInfo,
} from '../../core/models/workspace-info';
import { projectFileTags } from './identifiers';
import { Enricher } from '../../core/models/enricher';
import type { ReadonlyTree } from '../../core/domain/tree';

export class JestEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    if (workspaceInfo.projects.length === 0) {
      return workspaceInfo;
    }

    const discoveredFiles = (
      await Promise.all(
        workspaceInfo.projects.map((project) =>
          this._discoverJestConfigFiles(project.path),
        ),
      )
    ).flat();

    return workspaceInfo.merge({ files: discoveredFiles });
  }

  private async _discoverJestConfigFiles(
    projectRoot: RelativePath,
  ): Promise<FileInfo[]> {
    const files = await this._tree.scanDirectory(projectRoot);
    const jestConfigPattern = /^jest\.config\.(ts|js|mjs|cjs)$/;

    return files
      .filter((file) => {
        const relativeToProject = relative(projectRoot, file);
        return (
          !relativeToProject.includes('/') &&
          jestConfigPattern.test(relativeToProject)
        );
      })
      .map((path) => ({
        path,
        tags: [projectFileTags.jestConfig],
      }));
  }
}
