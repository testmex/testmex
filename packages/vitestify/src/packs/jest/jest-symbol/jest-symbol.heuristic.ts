import { defineFileContentHeuristic } from '../../../core/domain/define-file-content-heuristic';
import { fileTags as coreFileTags } from '../../core/identifiers';
import { findingTypes } from '../identifiers';

const jestSymbolPattern = /\bjest\b/;

export const jestSymbolHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(coreFileTags.test),
  inspect: ({ file, project, content }) => {
    if (!jestSymbolPattern.test(content)) {
      return [];
    }

    return [
      {
        type: findingTypes.jestSymbol,
        project,
        file,
      },
    ];
  },
});
