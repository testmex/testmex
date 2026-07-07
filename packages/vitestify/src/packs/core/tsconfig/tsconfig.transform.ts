import { dirname, join } from 'node:path/posix';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';
import type { WorkspaceTree } from '../../../core/domain/workspace';
import { fileTags } from '../identifiers';

const TSCONFIG_SPEC_FILE_NAME = 'tsconfig.spec.json';
const VITEST_CONFIG_FILE_NAMES = ['vitest.config.mts', 'vitest.config.ts'];

export const tsconfigTransform = defineTransform({
  name: 'tsconfig',
  apply: async (workspace) => {
    const { tree } = workspace;

    for (const file of workspace.getFiles()) {
      if (!file.tags.includes(fileTags.jestConfig)) {
        continue;
      }

      const projectDirectory = relativePath(dirname(file.path));

      if (!(await _hasVitestConfig({ directory: projectDirectory, tree }))) {
        continue;
      }

      const tsconfigSpecPath = relativePath(
        join(projectDirectory, TSCONFIG_SPEC_FILE_NAME),
      );
      const tsconfigSpec =
        await tree.maybeReadJsonFile<TsconfigSpec>(tsconfigSpecPath);

      if (tsconfigSpec == null) {
        continue;
      }

      const module = tsconfigSpec.compilerOptions?.module;

      if (module !== undefined && module !== 'commonjs') {
        continue;
      }

      tsconfigSpec.compilerOptions ??= {};
      tsconfigSpec.compilerOptions.module = 'preserve';

      await tree.write(tsconfigSpecPath, JSON.stringify(tsconfigSpec, null, 2));
    }
  },
});

interface TsconfigSpec {
  compilerOptions?: {
    module?: string;
  };
}

async function _hasVitestConfig({
  directory,
  tree,
}: {
  directory: RelativePath;
  tree: WorkspaceTree;
}): Promise<boolean> {
  for (const fileName of VITEST_CONFIG_FILE_NAMES) {
    if (
      (await tree.maybeReadFile(relativePath(join(directory, fileName)))) !==
      null
    ) {
      return true;
    }
  }

  return false;
}
