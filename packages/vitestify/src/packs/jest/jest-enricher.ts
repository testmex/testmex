import { basename } from 'node:path/posix';
import type { ReadonlyTree } from '../../core/domain/tree';
import { Enricher } from '../../core/models/enricher';
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
    return workspaceInfo.merge({
      files: await this._discoverJestConfigFiles(),
    });
  }

  private async _discoverJestConfigFiles(): Promise<FileInfo[]> {
    const files = await this._tree.scanDirectory();
    const jestConfigAlternativeFileNames = [
      'jest.config.ts',
      'jest.config.js',
      'jest.config.mjs',
      'jest.config.cjs',
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
