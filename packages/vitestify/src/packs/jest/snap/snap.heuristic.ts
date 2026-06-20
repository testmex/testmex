import { defineFileContentHeuristic } from '../../../core/domain/define-file-content-heuristic';
import { projectFileTags } from '../../core/identifiers';
import { findingTypes } from '../identifiers';

export const snapHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(projectFileTags.snapshot),
  inspect: ({ file, project }) => [
    {
      type: findingTypes.snapshot,
      project,
      file,
    },
  ],
});
