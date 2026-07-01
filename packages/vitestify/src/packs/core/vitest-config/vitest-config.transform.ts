import { dirname, join } from 'node:path/posix';
import {
  relativePath,
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

      let hasVitestConfig = false;
      for (const fileName of vitestConfigAlternativeFileNames) {
        if (
          (await tree.maybeReadFile(
            relativePath(join(configDirectory, fileName)),
          )) !== null
        ) {
          hasVitestConfig = true;
          break;
        }
      }
      if (hasVitestConfig) {
        continue;
      }

      const jestConfigContent = await tree.maybeReadFile(file.path);
      const setupFiles: string[] = [];
      if (jestConfigContent != null && jestConfigContent !== '') {
        const editor = new SgEditor(jestConfigContent);
        const config =
          editor.root.find('module.exports = $CONFIG')?.getMatch('CONFIG') ??
          editor.root.find('export default $CONFIG')?.getMatch('CONFIG');
        const configPairs = config
          ?.children()
          ?.filter((child) => child.kind() === 'pair');

        if (configPairs != null) {
          for (const key of JEST_SETUP_FILE_KEYS) {
            const pair = configPairs.find(
              (node) => node.child(0)?.text() === key,
            );
            if (pair != null) {
              setupFiles.push(
                ...pair
                  .findAll({ rule: { kind: 'string_fragment' } })
                  .map((node) => node.text()),
              );
            }
          }
        }
      }

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

      await tree.write(
        relativePath(join(configDirectory, vitestConfigFileName)),
        `
${joinImport}import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],\
${setupFilesBlock}
  },
});
`,
      );
    }

    commands.add(['pnpm', 'add', '-D', 'vite-tsconfig-paths']);
    commands.add(['pnpm', 'add', '-D', 'vitest']);
  },
});
