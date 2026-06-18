import type { RelativePath } from '../../core/relative-path';
import {
  projectFileTag,
  type ProjectFile,
  type WorkspaceInfo,
} from '../../core/workspace-info';
import { Enricher } from '../../core/enricher';
import type { ReadonlyTree } from '../../core/tree';

export class TestEnricher implements Enricher {
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
            ...(await this._discoverTestFiles(project.path)),
          ],
        })),
      ),
    };
  }

  private async _discoverTestFiles(
    projectRoot: RelativePath,
  ): Promise<ProjectFile[]> {
    const files = await this._tree.scanDirectory(projectRoot);
    const testFilePattern = /\.spec\.ts$/;

    return files
      .filter((file) => testFilePattern.test(file))
      .map((path) => ({
        path,
        tags: [projectFileTag.test],
      }));
  }
}
