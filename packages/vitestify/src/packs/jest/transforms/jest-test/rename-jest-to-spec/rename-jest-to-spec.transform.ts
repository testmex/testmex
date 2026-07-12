import { defineTransform } from '../../../../../core/models/transform';
import {
  relativePath,
  type RelativePath,
} from '../../../../../core/models/relative-path';
import {
  JEST_CTS_EXTENSION,
  JEST_TSX_EXTENSION,
  SPEC_TS_EXTENSION,
  SPEC_TSX_EXTENSION,
} from '../../../constants';
import { findingTypes } from '../../../identifiers';

export const renameJestToSpecTransform = defineTransform({
  name: 'rename-jest-to-spec',
  apply: async (workspace, { onProgress } = {}) => {
    const jestTestPaths = workspace.files
      .filter((file) => file.findings.includes(findingTypes.jestSymbol))
      .map((file) => file.path);
    let transformedCount = 0;

    for (const path of jestTestPaths) {
      const renamedPath = renameJestToSpecFile(path);

      if (renamedPath !== null) {
        await workspace.rename(path, renamedPath);
        transformedCount++;
      }
    }

    onProgress?.(`${transformedCount} file(s) transformed`);
  },
});

function renameJestToSpecFile(path: RelativePath): RelativePath | null {
  if (path.endsWith(JEST_TSX_EXTENSION)) {
    return relativePath(
      path.slice(0, -JEST_TSX_EXTENSION.length) + SPEC_TSX_EXTENSION,
    );
  }

  if (path.endsWith(JEST_CTS_EXTENSION)) {
    return relativePath(
      path.slice(0, -JEST_CTS_EXTENSION.length) + SPEC_TS_EXTENSION,
    );
  }

  return null;
}
