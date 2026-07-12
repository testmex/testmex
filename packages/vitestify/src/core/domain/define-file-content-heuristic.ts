import type { FindingType, HeuristicResult } from '../models/finding';
import { defineHeuristic, type Heuristic } from '../models/heuristic';
import type { FileInfo } from './workspace';

export interface FileContentInspectionArgs {
  file: FileInfo;
  content: string;
}

export interface DefineFileContentHeuristicArgs {
  name: string;
  predicate: (file: FileInfo) => boolean;
  inspect: (args: FileContentInspectionArgs) => FindingType[];
}

export function defineFileContentHeuristic({
  name,
  predicate,
  inspect,
}: DefineFileContentHeuristicArgs): Heuristic {
  return defineHeuristic({
    name,
    inspect: async (workspace) => {
      const findingsList = await Promise.all(
        workspace.files
          .filter((file) => predicate(file))
          .map(async (file) => {
            const content = await workspace.tree.maybeReadFile(file.path);

            if (content === null) {
              return [];
            }

            return inspect({ file, content }).map((type) => ({
              type,
              filePath: file.path,
            }));
          }),
      );

      return { findings: findingsList.flat() };
    },
  });
}
