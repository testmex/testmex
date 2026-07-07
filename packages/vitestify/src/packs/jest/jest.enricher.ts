import { basename, dirname } from 'node:path/posix';
import { Enricher } from '../../core/models/enricher';
import type { ReadonlyWorkspace } from '../../core/domain/workspace';
import { relativePath } from '../../core/models/relative-path';
import { fileTags } from '../core/identifiers';

export class JestEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const jestConfigPaths = await this._discoverJestConfigPaths(workspace);

    return {
      fileInfos: jestConfigPaths.map((path) => ({
        path,
        tags: [fileTags.jestConfig],
      })),
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
}
