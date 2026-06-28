import type { FindingType } from '../models/finding';
import { defineTransform, type Transform } from '../models/transform';
import type { FileInfo, FileTag } from '../models/workspace-info';

interface DefineFileTransformBase {
  name: string;
  apply: (content: string) => string;
}

export type DefineFileTransformArgs = DefineFileTransformBase &
  ({ findingType: FindingType } | { fileTags?: FileTag[] });

export function defineFileTransform(args: DefineFileTransformArgs): Transform {
  return defineTransform({
    name: args.name,
    apply: async ({ findings, workspace }) => {
      const { info, tree } = workspace;

      const fileTags = 'fileTags' in args ? args.fileTags : undefined;

      const taggedFiles =
        fileTags !== undefined
          ? info
              .getFiles()
              .filter((file) =>
                fileTags.every((tag) => file.tags.includes(tag)),
              )
          : undefined;

      const findingFiles =
        'findingType' in args
          ? findings
              .filter((finding) => finding.type === args.findingType)
              .map((finding) => finding.file)
              .filter((file): file is FileInfo => file !== undefined)
          : undefined;

      for (const file of taggedFiles ?? findingFiles ?? []) {
        const content = await tree.maybeReadFile(file.path);

        if (content != null) {
          await tree.write(file.path, args.apply(content));
        }
      }
    },
  });
}
