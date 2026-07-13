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
    // Unicode-aware equivalent of `^\s*${global}\b`: JS `\b` only treats ASCII
    // as word characters, so it matches `it` inside words such as `itération`.
    new RegExp(`^\\s*${global}(?![\\p{L}\\p{N}_])`, 'mu').test(content),
  );
}
