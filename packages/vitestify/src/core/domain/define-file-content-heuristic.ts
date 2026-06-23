import type { Finding } from '../models/finding';
import { defineHeuristic, type Heuristic } from '../models/heuristic';
import type { FileInfo, Project } from '../models/workspace-info';

export interface FileContentInspectionArgs {
  file: FileInfo;
  project: Project;
  content: string;
}

export interface DefineFileContentHeuristicArgs {
  predicate: (file: FileInfo) => boolean;
  inspect: (args: FileContentInspectionArgs) => Finding[];
}

export function defineFileContentHeuristic({
  predicate,
  inspect,
}: DefineFileContentHeuristicArgs): Heuristic {
  return defineHeuristic({
    inspect: async ({ info, tree }) => {
      const findingsList = await Promise.all(
        info
          .getFiles()
          .filter((file) => predicate(file))
          .map(async (entry) => {
            const { project, ...file } = entry;
            const content = await tree.maybeReadFile(file.path);

            return content === null
              ? []
              : inspect({ file, project, content });
          }),
      );

      return findingsList.flat();
    },
  });
}
