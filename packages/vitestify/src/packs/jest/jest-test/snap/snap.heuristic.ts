import { defineFileContentHeuristic } from '../../../../core/domain/define-file-content-heuristic';
import { fileTags } from '../../../core/identifiers';
import { findingTypes } from '../../identifiers';

export const snapHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(fileTags.snapshot),
  inspect: ({ file, project }) => [
    {
      type: findingTypes.snapshot,
      project,
      file,
    },
  ],
});
