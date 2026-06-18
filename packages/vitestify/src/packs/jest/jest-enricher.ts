import { relative } from 'node:path/posix';
import type { RelativePath } from '../../core/relative-path';
import {
  projectFileTag,
  type ProjectFile,
  type WorkspaceInfo,
} from '../../core/workspace-info';
import { Enricher } from '../../core/enricher';
import type { ReadonlyTree } from '../../core/tree';

export class JestEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    if (workspaceInfo.projects.length === 0) {
      return workspaceInfo;
    }

    return {
      ...workspaceInfo,
      projects: await Promise.all(
        workspaceInfo.projects.map(async (project) => ({
          ...project,
          files: [
            ...project.files,
            ...(await this._discoverJestConfigFiles(project.path)),
          ],
        })),
      ),
    };
  }

  private async _discoverJestConfigFiles(
    projectRoot: RelativePath,
  ): Promise<ProjectFile[]> {
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
        tags: [projectFileTag.jestConfig],
      }));
  }
}
