import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags as coreFileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';
import { jestGlobals } from './jest-globals';

export const vitestImportsHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(coreFileTags.test),
  inspect: ({ file, project, content }) =>
    _isUsingJestGlobals(content)
      ? [
          {
            file,
            project,
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
