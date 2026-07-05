import { defineFileContentHeuristic } from '../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from './identifiers';

const DOM_PATTERN = /\b(document|testing-library)\b/;

export const domHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(fileTags.test),
  inspect: ({ file, projects, content }) => {
    if (!DOM_PATTERN.test(content)) {
      return [];
    }

    return [
      {
        type: findingTypes.dom,
        projects,
        file,
      },
    ];
  },
});
