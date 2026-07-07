import { defineTransform } from '../../../core/models/transform';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { findingTypes } from '../identifiers';

export const renameSpecToJestTransform = defineTransform({
  name: 'rename-spec-to-jest',
  apply: async (workspace) => {
    const jestTestPaths = workspace.findings
      .filter((finding) => finding.type === findingTypes.jestSymbol)
      .flatMap((finding) =>
        finding.filePath === undefined ? [] : [finding.filePath],
      );

    for (const path of jestTestPaths) {
      const renamedPath = renameSpecToJestFile(path);

      if (renamedPath !== null) {
        await workspace.rename(path, renamedPath);
      }
    }
  },
});

function renameSpecToJestFile(path: RelativePath): RelativePath | null {
  if (path.endsWith('.spec.tsx')) {
    return relativePath(path.slice(0, -'.spec.tsx'.length) + '.jest.tsx');
  }

  if (path.endsWith('.spec.ts')) {
    return relativePath(path.slice(0, -'.spec.ts'.length) + '.jest.cts');
  }

  return null;
}
