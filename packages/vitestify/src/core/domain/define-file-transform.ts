import type { Finding, FindingType } from '../models/finding';
import { defineTransform, type Transform } from '../models/transform';
import type { FileInfo, FileTag } from '../models/workspace-info';

export interface DefineFileTransformArgs {
  name: string;
  findingType?: FindingType;
  fileTags?: FileTag[];
  apply: (content: string) => string;
}

export function defineFileTransform(args: DefineFileTransformArgs): Transform {
  return defineTransform({
    name: args.name,
    apply: async ({ findings, workspace }) => {
      const { tree } = workspace;

      for (const finding of findings) {
        const file = finding.file;

        if (
          !_matchesFinding(finding, args.findingType) ||
          !_matchesFile(file, args.fileTags)
        ) {
          continue;
        }

        const content = await tree.maybeReadFile(file.path);

        if (content != null) {
          await tree.write(file.path, args.apply(content));
        }
      }
    },
  });
}

function _matchesFinding(
  finding: Finding,
  findingType: FindingType | undefined,
): boolean {
  return findingType === undefined || finding.type === findingType;
}

function _matchesFile(
  file: FileInfo | undefined,
  fileTags: FileTag[] | undefined,
): file is FileInfo {
  return (
    file !== undefined &&
    (fileTags === undefined || fileTags.every((tag) => file.tags.includes(tag)))
  );
}
