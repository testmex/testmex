import { basename, dirname } from 'node:path/posix';
import type { ReadonlyWorkspace } from '../../core/domain/workspace';
import { Enricher } from '../../core/models/enricher';
import { relativePath } from '../../core/models/relative-path';
import { fileTags } from '../core/identifiers';
import { JEST_CTS_EXTENSION, JEST_TSX_EXTENSION } from './constants';

export class JestEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const jestConfigPaths = await this._discoverJestConfigPaths(workspace);
    const jestTestPaths = await this._discoverJestTestPaths(workspace);

    return {
      fileInfos: [
        ...jestConfigPaths.map((path) => ({
          path,
          tags: [fileTags.jestConfig],
        })),
        ...jestTestPaths.map((path) => ({
          path,
          tags: [fileTags.test],
        })),
      ],
      projects: jestConfigPaths.flatMap((filePath) => {
        const path = relativePath(dirname(filePath));
        const alreadyExists = workspace.info.projects.some(
          (project) => project.path === path,
        );

        if (alreadyExists) {
          return [];
        }

        return [{ path }];
      }),
    };
  }

  private async _discoverJestConfigPaths(workspace: ReadonlyWorkspace) {
    const files = await workspace.tree.scanDirectory();
    const jestConfigAlternativeFileNames = [
      'jest.config.ts',
      'jest.config.js',
      'jest.config.mjs',
      'jest.config.mts',
      'jest.config.cjs',
      'jest.config.cts',
    ];

    return files.filter((path) =>
      jestConfigAlternativeFileNames.some((name) =>
        basename(path).endsWith(name),
      ),
    );
  }

  private async _discoverJestTestPaths(workspace: ReadonlyWorkspace) {
    const paths = await workspace.tree.scanDirectory();

    return paths.filter(
      (path) =>
        path.endsWith(JEST_CTS_EXTENSION) || path.endsWith(JEST_TSX_EXTENSION),
    );
  }
}
