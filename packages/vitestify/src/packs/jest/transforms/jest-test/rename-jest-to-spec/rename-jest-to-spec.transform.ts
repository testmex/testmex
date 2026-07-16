import { defineTransform } from '../../../../../core/models/transform';
import { renameJestToSpecFile } from '../../../jest-core';
import { findingTypes } from '../../../identifiers';

export const renameJestToSpecTransform = defineTransform({
  name: 'rename-jest-to-spec',
  apply: async ({ workspace, progressStep }) => {
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

    progressStep.updateMessage(`${transformedCount} file(s) transformed`);
  },
});
