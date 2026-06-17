import type { RelativePath } from '../core/relative-path';
import {
  projectFileTag,
  type ProjectFile,
  type WorkspaceInfo,
} from '../core/workspace-info';
import { FileSystem } from '../infra/file-system';
import { Enricher } from './enricher';

export class TestEnricher implements Enricher {
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
            ...(await this._discoverTestFiles(project.path)),
          ],
        })),
      ),
    };
  }

  private async _discoverTestFiles(
    projectRoot: RelativePath,
  ): Promise<ProjectFile[]> {
    const files = await this._fileSystem.scanDirectory(projectRoot);
    const testFilePattern = /\.spec\.ts$/;

    return files
      .filter((file) => testFilePattern.test(file))
      .map((path) => ({
        path,
        tags: [projectFileTag.test],
      }));
  }
}
