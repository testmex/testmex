import { basename, dirname, join } from 'node:path/posix';
import type { FileTag, ReadonlyWorkspace } from '../../../core/domain/workspace';
import type { EnrichmentFileInfo } from '../../../core/models/workspace-state';
import { defineEnricher } from '../../../core/models/enricher';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../../core/identifiers';
import { JEST_CTS_EXTENSION, JEST_TSX_EXTENSION } from '../constants';

const JEST_CONFIG_FILE_NAMES = [
  'jest.config.ts',
  'jest.config.js',
  'jest.config.mjs',
  'jest.config.mts',
  'jest.config.cjs',
  'jest.config.cts',
] as const;

const JEST_FILE_GLOB_PATTERN = '**/*.{ts,tsx,cts,js,mjs,mts,cjs}';

const JEST_SETUP_FILE_KEYS = ['setupFiles', 'setupFilesAfterEnv'];

type JestDiscoveredFileType = typeof fileTags.jestConfig | typeof fileTags.test;

interface JestDiscoveredFile {
  path: RelativePath;
  type: JestDiscoveredFileType;
}

export const jestEnricher = defineEnricher({
  name: 'jest',
  async enrich({ onProgress, workspace }) {
    const files: Array<{ type: FileTag; path: RelativePath }> = [];
    for await (const file of _discoverJestFiles(workspace)) {
      files.push(file);
      onProgress?.(`${files.length} file(s) found`);
    }

    const jestConfigPaths = files
      .filter((file) => file.type === fileTags.jestConfig)
      .map((file) => file.path);
    const jestTestPaths = files
      .filter((file) => file.type === fileTags.test)
      .map((file) => file.path);

    const jestSetupFileInfos = await _discoverJestSetupFileInfos(
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
        const alreadyExists = workspace.projects.some(
          (project) => project.path === path,
        );

        if (alreadyExists) {
          return [];
        }

        return [{ path }];
      }),
    };
  },
});

async function* _discoverJestFiles(
  workspace: ReadonlyWorkspace,
): AsyncGenerator<JestDiscoveredFile> {
  for await (const path of workspace.tree.scanDirectory({
    pattern: JEST_FILE_GLOB_PATTERN,
  })) {
    if (
      path.endsWith(JEST_CTS_EXTENSION) ||
      path.endsWith(JEST_TSX_EXTENSION)
    ) {
      yield { path, type: fileTags.test };
    }

    if (
      JEST_CONFIG_FILE_NAMES.some((name) => basename(path).endsWith(name))
    ) {
      yield { path, type: fileTags.jestConfig };
    }
  }
}

async function _discoverJestSetupFileInfos(
  workspace: ReadonlyWorkspace,
  jestConfigPaths: RelativePath[],
): Promise<EnrichmentFileInfo[]> {
  const fileInfos: EnrichmentFileInfo[] = [];

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
