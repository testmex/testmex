import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags, findingTypes } from '../../identifiers';

const ANGULAR_PATTERN = /['"]@angular\//;

export const angularHeuristic = defineFileContentHeuristic({
  name: 'angular',
  predicate: (file) =>
    file.tags.includes(fileTags.code) || file.tags.includes(fileTags.test),
  inspect: ({ content }) =>
    ANGULAR_PATTERN.test(content) ? [findingTypes.angular] : [],
});
