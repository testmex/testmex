import { defineTransform } from '../../../../core/models/transform';
import {
  relativePath,
  type RelativePath,
} from '../../../../core/models/relative-path';
import { findingTypes } from '../../identifiers';

export const renameJestToSpecTransform = defineTransform({
  name: 'rename-jest-to-spec',
  apply: async (workspace) => {
    const jestTestPaths = workspace.findings
      .filter((finding) => finding.type === findingTypes.jestSymbol)
      .flatMap((finding) =>
        finding.filePath === undefined ? [] : [finding.filePath],
      );

    for (const path of jestTestPaths) {
      const renamedPath = renameJestToSpecFile(path);

      if (renamedPath !== null) {
        await workspace.rename(path, renamedPath);
      }
    }
  },
});

function renameJestToSpecFile(path: RelativePath): RelativePath | null {
  if (path.endsWith('.jest.tsx')) {
    return relativePath(path.slice(0, -'.jest.tsx'.length) + '.spec.tsx');
  }

  if (path.endsWith('.jest.cts')) {
    return relativePath(path.slice(0, -'.jest.cts'.length) + '.spec.ts');
  }

  return null;
}
