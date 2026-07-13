import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags as coreFileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { JEST_GLOBALS } from '../../transforms/jest-test/vitest-imports/jest-globals';

export const vitestImportsNeededHeuristic = defineFileContentHeuristic({
  name: 'vitest-imports-needed',
  predicate: (file) =>
    file.tags.includes(coreFileTags.test) ||
    file.tags.includes(coreFileTags.code),
  inspect: ({ content }) =>
    _isUsingJestGlobals(content) ? [findingTypes.vitestImportsNeeded] : [],
});

function _isUsingJestGlobals(content: string): boolean {
  return JEST_GLOBALS.some((global) =>
    new RegExp(`\\b${global}\\b`).test(content),
  );
}
