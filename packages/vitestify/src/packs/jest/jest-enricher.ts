import { relative } from 'node:path';
import type { RelativePath } from '../../core/relative-path';
import {
  projectFileTag,
  type ProjectFile,
  type WorkspaceInfo,
} from '../../core/workspace-info';
import { FileSystem } from '../../infra/file-system';
import { Enricher } from '../../scanner/enricher';

export class JestEnricher implements Enricher {
  private readonly _fileSystem: FileSystem;

  constructor({ fileSystem }: { fileSystem: FileSystem }) {
    this._fileSystem = fileSystem;
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
    const files = await this._fileSystem.scanDirectory(projectRoot);
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
