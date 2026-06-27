import { defineTransform } from '../../../core/models/transform';
import { relativePath } from '../../../core/models/relative-path';
import { fileTags } from '../../core/identifiers';

export const jestRenameSpecToJestTransform = defineTransform({
  name: 'jest-rename-spec-to-jest',
  apply: async ({ workspace }) => {
    const { info, tree } = workspace;

    for (const file of info.files) {
      if (!file.tags.includes(fileTags.test)) {
        continue;
      }

      if (file.path.endsWith('.spec.ts')) {
        await tree.rename(
          file.path,
          relativePath(file.path.replace(/\.spec\.ts$/, '.jest.ts')),
        );
        continue;
      }

      if (file.path.endsWith('.test.ts')) {
        await tree.rename(
          file.path,
          relativePath(file.path.replace(/\.test\.ts$/, '.jest.ts')),
        );
      }
    }
  },
});
