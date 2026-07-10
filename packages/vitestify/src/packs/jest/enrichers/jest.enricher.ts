import { basename, dirname, join } from 'node:path/posix';
import type { FileInfo, ReadonlyWorkspace } from '../../../core/domain/workspace';
import { Enricher, type EnricherOptions } from '../../../core/models/enricher';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../../core/identifiers';
import { JEST_CTS_EXTENSION, JEST_TSX_EXTENSION } from '../constants';

const JEST_SETUP_FILE_KEYS = ['setupFiles', 'setupFilesAfterEnv'];

export class JestEnricher implements Enricher {
  readonly name = 'jest';

  async enrich({ workspace }: EnricherOptions) {
    const jestConfigPaths = await this._discoverJestConfigPaths(workspace);
    const jestTestPaths = await this._discoverJestTestPaths(workspace);
    const jestSetupFileInfos = await this._discoverJestSetupFileInfos(
      workspace,
      jestConfigPaths,
    );

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
        ...jestSetupFileInfos,
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
    const files = [];
    for await (const path of workspace.tree.scanDirectory()) {
      files.push(path);
    }
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
    const paths = [];
    for await (const path of workspace.tree.scanDirectory()) {
      paths.push(path);
    }

    return paths.filter(
      (path) =>
        path.endsWith(JEST_CTS_EXTENSION) || path.endsWith(JEST_TSX_EXTENSION),
    );
  }

  private async _discoverJestSetupFileInfos(
    workspace: ReadonlyWorkspace,
    jestConfigPaths: RelativePath[],
  ): Promise<FileInfo[]> {
    const fileInfos: FileInfo[] = [];

    for (const jestConfigPath of jestConfigPaths) {
      const jestConfigContent =
        await workspace.tree.maybeReadFile(jestConfigPath);
      if (jestConfigContent == null) {
        continue;
      }

      const jestConfigDirectory = relativePath(dirname(jestConfigPath));
      const setupFilePaths = _parseSetupFilePaths(jestConfigContent);

      for (const setupFilePath of setupFilePaths) {
        const resolvedPath = _resolveSetupFileRelativePath(
          setupFilePath,
          jestConfigDirectory,
        );
        const exists =
          (await workspace.tree.maybeReadFile(resolvedPath)) != null;

        if (exists) {
          fileInfos.push({
            path: resolvedPath,
            tags: [fileTags.jestSetup],
          });
        }
      }
    }

    return fileInfos;
  }
}

function _parseSetupFilePaths(jestConfigContent: string): string[] {
  const editor = new SgEditor(jestConfigContent);

  return editor.root
    .findAll({ rule: { kind: 'pair' } })
    .filter((node) => {
      const key = node.child(0)?.text();
      return key ? JEST_SETUP_FILE_KEYS.includes(key) : false;
    })
    .flatMap((node) =>
      node.child(2)?.findAll({ rule: { kind: 'string_fragment' } }),
    )
    .map((node) => node?.text())
    .filter((path): path is string => path != null);
}

function _resolveSetupFileRelativePath(
  setupFilePath: string,
  jestConfigDirectory: RelativePath,
): RelativePath {
  const path = setupFilePath.replace(/^<rootDir>\/?/, '');

  return relativePath(join(jestConfigDirectory, path));
}
