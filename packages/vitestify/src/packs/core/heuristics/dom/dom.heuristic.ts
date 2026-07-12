import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from '../../identifiers';

const DOM_PATTERN = /\b(TestBed|document|testing-library)\b/;

export const domHeuristic = defineFileContentHeuristic({
  name: 'dom',
  predicate: (file) => file.tags.includes(fileTags.test),
  inspect: ({ content }) => {
    if (!DOM_PATTERN.test(content)) {
      return [];
    }

    return [findingTypes.dom];
  },
});
