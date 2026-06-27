import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags as coreFileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';

const replaceApiPattern =
  /\bfit\s*(?:\(|\.)|(?:it|test)\.(?:only|skip)\.failing\b|(?:it|test)\.failing\b|\bxit\s*\(|\bxdescribe\s*\(|\bxtest\s*\(|\bfdescribe\s*\(/;

export const replaceApiHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(coreFileTags.test),
  inspect: ({ file, project, content }) => {
    if (!replaceApiPattern.test(content)) {
      return [];
    }

    return [
      {
        type: findingTypes.jestSymbol,
        project,
        file,
      },
    ];
  },
});
