import { defineTransform } from '../../../../core/models/transform';
import {
  relativePath,
  type RelativePath,
} from '../../../../core/models/relative-path';
import {
  JEST_CTS_EXTENSION,
  JEST_TSX_EXTENSION,
  SPEC_TS_EXTENSION,
  SPEC_TSX_EXTENSION,
} from '../../constants';
import { findingTypes } from '../../identifiers';

export const renameSpecToJestTransform = defineTransform({
  name: 'rename-spec-to-jest',
  apply: async ({ workspace, onProgress }) => {
    const jestTestPaths = workspace.files
      .filter((file) => file.findings.includes(findingTypes.jestSymbol))
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
