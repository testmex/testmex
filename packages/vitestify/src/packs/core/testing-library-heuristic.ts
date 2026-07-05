import { defineFileContentHeuristic } from '../../core/domain/define-file-content-heuristic';
import type { Finding } from '../../core/models/finding';
import { fileTags, findingTypes } from './identifiers';

const ANGULAR_IMPORT_PATTERN = /['"]@testing-library\/angular['"]/;
const JEST_DOM_IMPORT_PATTERN = /['"]@testing-library\/jest-dom['"]/;
const REACT_IMPORT_PATTERN = /['"]@testing-library\/react['"]/;

export const testingLibraryHeuristic = defineFileContentHeuristic({
  predicate: (file) =>
    file.tags.includes(fileTags.code) || file.tags.includes(fileTags.test),
  inspect: ({ file, projects, content }) => {
    const findings: Finding[] = [];

    if (
      file.tags.includes(fileTags.code) &&
      JEST_DOM_IMPORT_PATTERN.test(content)
    ) {
      findings.push({
        type: findingTypes.testingLibraryJestDom,
        projects,
        file,
      });
    }

    if (ANGULAR_IMPORT_PATTERN.test(content)) {
      findings.push({
        type: findingTypes.testingLibraryAngular,
        projects,
        file,
      });
    }

    if (REACT_IMPORT_PATTERN.test(content)) {
      findings.push({
        type: findingTypes.testingLibraryReact,
        projects,
        file,
      });
    }

    return findings;
  },
});
