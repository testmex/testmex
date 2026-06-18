import type { RelativePath } from '../../core/models/relative-path';
import {
  type ProjectFile,
  type WorkspaceInfo,
} from '../../core/models/workspace-info';
import { projectFileTags } from './identifiers';
import { Enricher } from '../../core/models/enricher';
import type { ReadonlyTree } from '../../core/domain/tree';

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
    const testFilePattern = /\.spec\.tsx?$/;

    return files
      .filter((file) => file.endsWith('.spec.ts') || file.endsWith('.spec.tsx'))
      .map((path) => ({
        path,
        tags: [projectFileTags.test],
      }));
  }
}
