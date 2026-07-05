import { defineFileContentHeuristic } from '../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from './identifiers';

const REACT_PATTERN = /['"]react(?:-dom)?['"]/;

export const reactHeuristic = defineFileContentHeuristic({
  predicate: (file) =>
    file.tags.includes(fileTags.code) || file.tags.includes(fileTags.test),
  inspect: ({ file, projects, content }) => {
    if (!REACT_PATTERN.test(content)) {
      return [];
    }

    return [
      {
        type: findingTypes.react,
        projects,
        file,
      },
    ];
  },
});
