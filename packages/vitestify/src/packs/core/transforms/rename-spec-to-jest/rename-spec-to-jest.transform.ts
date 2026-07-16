import { findingType } from '../../../../core/models/finding';
import { defineTransform } from '../../../../core/models/transform';
import { renameSpecToJestFile } from '../../../jest/jest-core';

const JEST_SYMBOL_FINDING = findingType('jest-symbol');

/*
  Rename Jest tests to `.jest.cts` so they are excluded from Vitest's default
  test patterns. This allows users to first set up Vitest, then apply Jest test
  transforms later when ready.
*/
export const renameSpecToJestTransform = defineTransform({
  name: 'rename-spec-to-jest',
  apply: async ({ workspace, progressStep }) => {
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

    progressStep.updateMessage(`${transformedCount} file(s) transformed`);
  },
});
