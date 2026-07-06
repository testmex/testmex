import { basename, dirname } from 'node:path/posix';
import type { ReadonlyTree } from '../../core/domain/tree';
import { Enricher } from '../../core/models/enricher';
import { relativePath } from '../../core/models/relative-path';
import {
  type FileInfo,
  type WorkspaceInfo,
} from '../../core/models/workspace-info';
import { fileTags } from '../core/identifiers';

export class JestEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const files = await this._discoverJestConfigFiles();

    return workspaceInfo.merge({
      files,
      projects: files.flatMap((file) => {
        const path = relativePath(dirname(file.path));
        const alreadyExists = workspaceInfo.projects.some(
          (project) => project.path === path,
        );

        if (alreadyExists) {
          return [];
        }

        return [{ path }];
      }),
    });
  }

  private async _discoverJestConfigFiles(): Promise<FileInfo[]> {
    const files = await this._tree.scanDirectory();
    const jestConfigAlternativeFileNames = [
      'jest.config.ts',
      'jest.config.js',
      'jest.config.mjs',
      'jest.config.mts',
      'jest.config.cjs',
      'jest.config.cts',
    ];

    return files
      .filter((path) =>
        jestConfigAlternativeFileNames.some((name) =>
          basename(path).endsWith(name),
        ),
      )
      .map((path) => ({
        path,
        tags: [fileTags.jestConfig],
      }));
  }
}
