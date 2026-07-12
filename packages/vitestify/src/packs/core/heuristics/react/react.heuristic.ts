import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from '../../identifiers';

const REACT_PATTERN = /['"]react(?:-dom)?['"]/;

export const reactHeuristic = defineFileContentHeuristic({
  name: 'react',
  predicate: (file) =>
    file.tags.includes(fileTags.code) || file.tags.includes(fileTags.test),
  inspect: ({ content }) =>
    REACT_PATTERN.test(content) ? [findingTypes.react] : [],
});
