import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags as coreFileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';

const jestSymbolPattern = /\bjest\b/;

export const jestSymbolHeuristic = defineFileContentHeuristic({
  name: 'jest-symbol',
  predicate: (file) =>
    file.tags.includes(coreFileTags.test) ||
    file.tags.includes(coreFileTags.code),
  inspect: ({ content }) =>
    jestSymbolPattern.test(content) ? [findingTypes.jestSymbol] : [],
});
