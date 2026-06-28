import { dirname, join } from 'node:path/posix';
import type { ReadonlyTree } from '../../../core/domain/tree';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';
import { fileTags } from '../identifiers';

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

      await tree.write(
        relativePath(join(configDirectory, vitestConfigFileName)),
        _vitestConfigContent(),
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

function _vitestConfigContent(): string {
  return `
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
});
`;
}
