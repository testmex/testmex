import { findingType } from '../../../../core/models/finding';
import {
  relativePath,
  type RelativePath,
} from '../../../../core/models/relative-path';
import { defineTransform } from '../../../../core/models/transform';

const SPEC_TS_EXTENSION = '.spec.ts' as const;
const SPEC_TSX_EXTENSION = '.spec.tsx' as const;
const JEST_CTS_EXTENSION = '.jest.cts' as const;
const JEST_TSX_EXTENSION = '.jest.tsx' as const;
const JEST_SYMBOL_FINDING = findingType('jest-symbol');

export const renameSpecToJestTransform = defineTransform({
  name: 'rename-spec-to-jest',
  apply: async ({ workspace, onProgress }) => {
    const jestTestPaths = workspace.files
      .filter((file) => file.findings.includes(JEST_SYMBOL_FINDING))
      .map((file) => file.path);
    let transformedCount = 0;

    for (const path of jestTestPaths) {
      const renamedPath = renameSpecToJestFile(path);

      if (renamedPath !== null) {
        await workspace.rename(path, renamedPath);
        transformedCount++;
      }
    }

    onProgress?.(`${transformedCount} file(s) transformed`);
  },
});

export function renameSpecToJestFile(path: RelativePath): RelativePath | null {
  if (path.endsWith(SPEC_TSX_EXTENSION)) {
    return relativePath(
      path.slice(0, -SPEC_TSX_EXTENSION.length) + JEST_TSX_EXTENSION,
    );
  }

  if (path.endsWith(SPEC_TS_EXTENSION)) {
    return relativePath(
      path.slice(0, -SPEC_TS_EXTENSION.length) + JEST_CTS_EXTENSION,
    );
  }

  return null;
}
