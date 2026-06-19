import { defineFileContentHeuristic } from '../../../core/domain/define-file-content-heuristic';
import type { ProjectFile } from '../../../core/models/workspace-info';
import { findingTypes } from '../identifiers';

function _isSnapshotFile(file: ProjectFile): boolean {
  return (
    file.path.endsWith('.snap') && file.path.includes('__snapshots__')
  );
}

const jestSnapshotPattern = /Array \[|Object \{/;

export const snapHeuristic = defineFileContentHeuristic({
  predicate: _isSnapshotFile,
  inspect: ({ file, project, content }) => {
    if (!jestSnapshotPattern.test(content)) {
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
