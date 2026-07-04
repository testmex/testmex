import { defineFileContentHeuristic } from '../../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from '../identifiers';

const JEST_DOM_IMPORT_PATTERN = /['"]@testing-library\/jest-dom['"]/;

export const testingLibraryJestDomHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(fileTags.code),
  inspect: ({ file, project, content }) => {
    if (!JEST_DOM_IMPORT_PATTERN.test(content)) {
      return [];
    }

    return [
      {
        type: findingTypes.testingLibraryJestDom,
        project,
        file,
      },
    ];
  },
});
