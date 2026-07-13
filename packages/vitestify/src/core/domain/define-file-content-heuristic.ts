import type { FindingType } from '../models/finding';
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
      const findingsList = [];

      for (const file of workspace.files) {
        if (!predicate(file)) {
          continue;
        }

        const content = await workspace.tree.maybeReadFile(file.path);

        if (content === null) {
          continue;
        }

        findingsList.push(
          ...inspect({ file, content }).map((type) => ({
            type,
            filePath: file.path,
          })),
        );
      }

      return { findings: findingsList.flat() };
    },
  });
}
