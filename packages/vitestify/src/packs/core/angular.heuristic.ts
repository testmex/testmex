import { defineFileContentHeuristic } from '../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from './identifiers';

const ANGULAR_PATTERN = /['"]@angular\//;

export const angularHeuristic = defineFileContentHeuristic({
  predicate: (file) =>
    file.tags.includes(fileTags.code) || file.tags.includes(fileTags.test),
  inspect: ({ file, projects, content }) => {
    if (!ANGULAR_PATTERN.test(content)) {
      return [];
    }

    return [
      {
        type: findingTypes.angular,
        projects,
        file,
      },
    ];
  },
});
