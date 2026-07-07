import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags as coreFileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { jestGlobals } from './jest-globals';

export const vitestImportsNeededHeuristic = defineFileContentHeuristic({
  predicate: (file) =>
    file.tags.includes(coreFileTags.test) ||
    file.tags.includes(coreFileTags.code),
  inspect: ({ file, projects, content }) =>
    _isUsingJestGlobals(content)
      ? [
          {
            file,
            projects,
            type: findingTypes.vitestImportsNeeded,
          },
        ]
      : [],
});

function _isUsingJestGlobals(content: string): boolean {
  return jestGlobals.some((global) =>
    new RegExp(`\\b${global}\\b`).test(content),
  );
}
