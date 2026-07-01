import { dirname, join } from 'node:path/posix';
import type { SgNode } from '@ast-grep/napi';
import type { ReadonlyTree } from '../../../core/domain/tree';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../identifiers';

const JEST_SETUP_FILE_KEYS = ['setupFiles', 'setupFilesAfterEnv'] as const;

const vitestConfigFileName = 'vitest.config.mts';
const vitestConfigAlternativeFileNames = [
  vitestConfigFileName,
  'vitest.config.ts',
];

export const vitestConfigTransform = defineTransform({
  name: 'vitest-config',
  apply: async ({ workspace }) => {
    const { commands, info, tree } = workspace;

    for (const file of info.files) {
      if (!file.tags.includes(fileTags.jestConfig)) {
        continue;
      }

      const configDirectory = relativePath(dirname(file.path));

      if (await _hasVitestConfig(tree, configDirectory)) {
        continue;
      }

      const setupFiles = await _extractJestSetupFiles(tree, file.path);

      await tree.write(
        relativePath(join(configDirectory, vitestConfigFileName)),
        _vitestConfigContent(setupFiles),
      );
    }

    commands.add(['pnpm', 'add', '-D', 'vite-tsconfig-paths']);
    commands.add(['pnpm', 'add', '-D', 'vitest']);
  },
});

async function _hasVitestConfig(
  tree: ReadonlyTree,
  projectRoot: RelativePath,
): Promise<boolean> {
  for (const fileName of vitestConfigAlternativeFileNames) {
    if (
      (await tree.maybeReadFile(relativePath(join(projectRoot, fileName)))) !==
      null
    ) {
      return true;
    }
  }

  return false;
}

async function _extractJestSetupFiles(
  tree: ReadonlyTree,
  jestConfigPath: RelativePath,
): Promise<string[]> {
  const jestConfigContent = await tree.maybeReadFile(jestConfigPath);
  if (jestConfigContent == null || jestConfigContent === '') {
    return [];
  }

  const configPairs = _findConfigPairs(jestConfigContent);
  if (configPairs == null) {
    return [];
  }

  const setupFiles: string[] = [];

  for (const key of JEST_SETUP_FILE_KEYS) {
    const pair = configPairs.find((node) => node.child(0)?.text() === key);
    if (pair != null) {
      setupFiles.push(
        ...pair
          .findAll({ rule: { kind: 'string_fragment' } })
          .map((node) => node.text()),
      );
    }
  }

  return setupFiles;
}

function _findConfigPairs(content: string): SgNode[] | undefined {
  const editor = new SgEditor(content);
  const config =
    editor.root.find('module.exports = $CONFIG')?.getMatch('CONFIG') ??
    editor.root.find('export default $CONFIG')?.getMatch('CONFIG');

  return config?.children()?.filter((child) => child.kind() === 'pair');
}

function _vitestConfigContent(setupFiles: string[]): string {
  const setupFilesBlock =
    setupFiles.length === 0
      ? ''
      : `
    setupFiles: [
      ${setupFiles
        .map(
          (path) =>
            `join(import.meta.dirname, ${JSON.stringify(path.replace(/^<rootDir>\/?/, './'))})`,
        )
        .join(',\n      ')},
    ],`;
  const joinImport =
    setupFiles.length === 0 ? '' : "import { join } from 'node:path';\n";

  return `
${joinImport}import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],\
${setupFilesBlock}
  },
});
`;
}
