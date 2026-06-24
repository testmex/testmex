import { defineFileContentHeuristic } from '../../../core/domain/define-file-content-heuristic';
import { projectFileTags } from '../../core/identifiers';
import { findingTypes } from '../identifiers';

export const jestConfigHeuristic = defineFileContentHeuristic({
  predicate: (file) => file.tags.includes(projectFileTags.jestConfig),
  inspect: ({ file, project }) => [
    {
      type: findingTypes.jestConfig,
      project,
      file,
    },
  ],
});
