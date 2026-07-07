import type { FindingType } from '../models/finding';
import { defineTransform, type Transform } from '../models/transform';
import type { FileTag } from './workspace';

interface DefineFileTransformBase {
  name: string;
  apply: (content: string) => string;
}

export type DefineFileTransformArgs = DefineFileTransformBase &
  ({ findingType: FindingType } | { fileTags?: FileTag[] });

export function defineFileTransform(args: DefineFileTransformArgs): Transform {
  return defineTransform({
    name: args.name,
    apply: async (workspace) => {
      const { findings, tree } = workspace;

      const fileTags = 'fileTags' in args ? args.fileTags : undefined;

      const taggedPaths =
        fileTags !== undefined
          ? workspace
              .getFiles()
              .filter((file) =>
                fileTags.every((tag) => file.tags.includes(tag)),
              )
              .map((file) => file.path)
          : undefined;

      const findingPaths =
        'findingType' in args
          ? findings
              .filter((finding) => finding.type === args.findingType)
              .flatMap((finding) =>
                finding.filePath === undefined ? [] : [finding.filePath],
              )
          : undefined;

      for (const path of taggedPaths ?? findingPaths ?? []) {
        const content = await tree.maybeReadFile(path);

        if (content != null) {
          await tree.write(path, args.apply(content));
        }
      }
    },
  });
}
