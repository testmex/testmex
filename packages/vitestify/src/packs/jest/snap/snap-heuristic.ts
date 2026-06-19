import type { Finding } from '../../../core/models/finding';
import type { Heuristic } from '../../../core/models/heuristic';
import type { Project, ProjectFile } from '../../../core/models/workspace-info';
import { findingTags, findingTypes } from '../identifiers';

interface SnapFileEntry {
  file: ProjectFile;
  project: Project;
  content: string | null;
}

function _isSnapshotFile(file: ProjectFile): boolean {
  return (
    file.path.endsWith('.snap') && file.path.includes('__snapshots__')
  );
}

export const snapHeuristic: Heuristic = {
  inspect: async ({ info, tree }): Promise<Finding[]> => {
    const snapFiles = await Promise.all(
      info.projects
        .flatMap((project) =>
          project.files
            .filter(_isSnapshotFile)
            .map((file) => ({ project, file })),
        )
        .map(async ({ file, project }) => ({
          file,
          project,
          content: await tree.maybeReadFile(file.path),
        })),
    );

    return _collectSnapFindings(snapFiles);
  },
};

const jestSnapshotPattern = /Array \[|Object \{/;

function _collectSnapFindings(snapFiles: SnapFileEntry[]): Finding[] {
  return snapFiles
    .filter(
      ({ content }) => content !== null && jestSnapshotPattern.test(content),
    )
    .map(({ file, project }) => ({
      type: findingTypes.jestSymbol,
      tags: [findingTags.jest],
      description: `Jest snapshot format in ${file.path}`,
      project,
      file,
    }));
}
