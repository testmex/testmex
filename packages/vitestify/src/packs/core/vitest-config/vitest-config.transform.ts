import { join, relative } from 'node:path/posix';
import { defineTransform } from '../../../core/models/transform';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import type { ReadonlyTree } from '../../../core/domain/tree';

const vitestConfigFileName = 'vitest.config.ts';

export const vitestConfigTransform = defineTransform({
  apply: async ({ workspace }) => {
    const { info, tree } = workspace;

    for (const project of info.projects) {
      if (await _hasVitestConfig(tree, project.path)) {
        continue;
      }

      await tree.write(
        relativePath(join(project.path, vitestConfigFileName)),
        _vitestConfigContent(),
      );
    }
  },
});

async function _hasVitestConfig(
  tree: ReadonlyTree,
  projectRoot: RelativePath,
): Promise<boolean> {
  const files = await tree.scanDirectory(projectRoot);

  return files.some(
    (file) => vitestConfigFileName === relative(projectRoot, file),
  );
}

function _vitestConfigContent(): string {
  return `
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.{test,spec}.{ts,tsx}'],
  },
});
`;
}
