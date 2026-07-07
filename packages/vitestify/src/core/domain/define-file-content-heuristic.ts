import type { Finding } from '../models/finding';
import { defineHeuristic, type Heuristic } from '../models/heuristic';
import type { FileInfo, Project } from './workspace';

export interface FileContentInspectionArgs {
  file: FileInfo;
  projects: Project[];
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
    inspect: async (workspace) => {
      const findingsList = await Promise.all(
        workspace
          .getFiles()
          .filter((file) => predicate(file))
          .map(async ({ projects, ...file }) => {
            const content = await workspace.tree.maybeReadFile(file.path);

            return content === null ? [] : inspect({ file, projects, content });
          }),
      );

      return findingsList.flat();
    },
  });
}
