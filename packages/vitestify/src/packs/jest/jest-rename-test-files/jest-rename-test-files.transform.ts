import { defineTransform } from '../../../core/models/transform';
import type { FileInfo } from '../../../core/models/workspace-info';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { findingTypes } from '../identifiers';

export const jestRenameTestFilesTransform = defineTransform({
  name: 'jest-rename-test-files',
  apply: async ({ findings, workspace }) => {
    const jestTestFiles = findings
      .filter((finding) => finding.type === findingTypes.jestSymbol)
      .map((finding) => finding.file)
      .filter((file): file is FileInfo => file !== undefined);

    for (const file of jestTestFiles) {
      const renamedPath = renameJestTestFile(file.path);

      if (renamedPath !== null) {
        await workspace.tree.rename(file.path, renamedPath);
      }
    }
  },
});

function renameJestTestFile(path: RelativePath): RelativePath | null {
  if (path.endsWith('.spec.tsx')) {
    return relativePath(path.slice(0, -'.spec.tsx'.length) + '.jest.tsx');
  }

  if (path.endsWith('.spec.ts')) {
    return relativePath(path.slice(0, -'.spec.ts'.length) + '.jest.cts');
  }

  return null;
}
