import { join, relative } from 'node:path/posix';
import type { ReadonlyTree } from '../../../core/domain/tree';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';

const vitestConfigFileName = 'vitest.config.mts';
const vitestConfigAlternativeFileNames = [
  vitestConfigFileName,
  'vitest.config.ts',
];

export const vitestConfigTransform = defineTransform({
  apply: async ({ workspace }) => {
    const { commands, info, tree } = workspace;

    for (const project of info.projects) {
      if (await _hasVitestConfig(tree, project.path)) {
        continue;
      }

      await tree.write(
        relativePath(join(project.path, vitestConfigFileName)),
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
  const files = await tree.scanDirectory(projectRoot);

  return files.some((file) =>
    vitestConfigAlternativeFileNames.includes(relative(projectRoot, file)),
  );
}

function _vitestConfigContent(): string {
  return `
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
    plugins: [tsconfigPaths()],
  },
});
`;
}
