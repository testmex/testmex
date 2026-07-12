import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from '../../identifiers';

const JEST_DOM_IMPORT_PATTERN = /['"]@testing-library\/jest-dom['"]/;
const REACT_IMPORT_PATTERN = /['"]@testing-library\/react['"]/;

export const testingLibraryHeuristic = defineFileContentHeuristic({
  name: 'testing-library',
  predicate: (file) =>
    file.tags.includes(fileTags.code) || file.tags.includes(fileTags.test),
  inspect: ({ file, content }) => {
    const findings = [];

    if (
      file.tags.includes(fileTags.code) &&
      JEST_DOM_IMPORT_PATTERN.test(content)
    ) {
      findings.push(findingTypes.testingLibraryJestDom);
    }

    if (REACT_IMPORT_PATTERN.test(content)) {
      findings.push(findingTypes.testingLibraryReact);
    }

    return findings;
  },
});
