import { dirname, join } from 'node:path/posix';
import { relativePath } from '../../../../core/models/relative-path';
import { defineTransform } from '../../../../core/models/transform';
import { fileTags } from '../../identifiers';

const TSCONFIG_SPEC_FILE_NAME = 'tsconfig.spec.json';

export const tsconfigTransform = defineTransform({
  name: 'tsconfig',
  apply: async (workspace, { onProgress } = {}) => {
    const { tree } = workspace;
    let transformedCount = 0;

    for (const file of workspace.files) {
      if (!file.tags.includes(fileTags.jestConfig)) {
        continue;
      }

      const projectDirectory = relativePath(dirname(file.path));

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
      transformedCount++;
    }

    onProgress?.(`${transformedCount} file(s) transformed`);
  },
});

interface TsconfigSpec {
  compilerOptions?: {
    module?: string;
  };
}
