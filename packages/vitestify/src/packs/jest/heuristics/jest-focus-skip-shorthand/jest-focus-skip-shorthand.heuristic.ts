import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags as coreFileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';

const JEST_FOCUS_SKIP_SHORTHAND_PATTERN =
  /\b[xf](?:describe|it|test)(?:\.|\s*\()|(?:it|test)(?:\.(?:only|skip))?\.failing\b/;

export const jestFocusSkipShorthandHeuristic = defineFileContentHeuristic({
  name: 'jest-focus-skip-shorthand',
  predicate: (file) =>
    file.tags.includes(coreFileTags.test) ||
    file.tags.includes(coreFileTags.code),
  inspect: ({ content }) => {
    if (!JEST_FOCUS_SKIP_SHORTHAND_PATTERN.test(content)) {
      return [];
    }

    return [findingTypes.jestFocusSkipShorthand];
  },
});
