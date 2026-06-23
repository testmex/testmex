import { join, relative } from 'node:path/posix';
import { defineTransform } from '../../../core/models/transform';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import type { ReadonlyTree } from '../../../core/domain/tree';

const vitestConfigFileName = 'vitest.config.mts';
const vitestConfigAlternativeFileNames = [
  vitestConfigFileName,
  'vitest.config.ts',
];

export const vitestConfigTransform = defineTransform({
  apply: async ({ workspace }) => {
    const { info, tree } = workspace;

    for (const project of info.projects) {
      if (await _hasVitestConfig(tree, project.path)) {
        continue;
      }

      const hasNx = await _hasNx(tree);

      await tree.write(
        relativePath(join(project.path, vitestConfigFileName)),
        _vitestConfigContent({ hasNx }),
      );
    }
  },
});

async function _hasNx(tree: ReadonlyTree): Promise<boolean> {
  const packageJson = await tree.maybeReadJsonFile<{
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }>(relativePath('package.json'));
  return packageJson?.dependencies?.nx != null;
}

async function _hasVitestConfig(
  tree: ReadonlyTree,
  projectRoot: RelativePath,
): Promise<boolean> {
  const files = await tree.scanDirectory(projectRoot);

  return files.some((file) =>
    vitestConfigAlternativeFileNames.includes(relative(projectRoot, file)),
  );
}

function _vitestConfigContent({ hasNx }: { hasNx: boolean }): string {
  return `
${hasNx ? `import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';\n` : ''}\
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
${hasNx ? `    plugins: [nxViteTsPaths()],\n` : ''}\
  },
});
`;
}
