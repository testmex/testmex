import type { Finding } from '../models/finding';
import { defineHeuristic, type Heuristic } from '../models/heuristic';
import type { Project, ProjectFile } from '../models/workspace-info';

export interface FileContentInspectionArgs {
  file: ProjectFile;
  project: Project;
  content: string;
}

export interface DefineFileContentHeuristicArgs {
  predicate: (file: ProjectFile) => boolean;
  inspect: (args: FileContentInspectionArgs) => Finding[];
}

export function defineFileContentHeuristic({
  predicate,
  inspect,
}: DefineFileContentHeuristicArgs): Heuristic {
  return defineHeuristic({
    inspect: async ({ info, tree }) => {
      const findingsList = await Promise.all(
        info.projects
          .flatMap((project) =>
            project.files
              .filter((file) => predicate(file))
              .map((file) => ({ project, file })),
          )
          .map(async ({ file, project }) => {
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
