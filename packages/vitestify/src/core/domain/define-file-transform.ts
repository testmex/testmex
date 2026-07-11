import type { FindingType } from '../models/finding';
import { defineTransform, type Transform } from '../models/transform';
import type { FileTag } from './workspace';
import { yieldToEventLoop } from '../utils/yield-to-event-loop';

interface DefineFileTransformBase {
  name: string;
  apply: (content: string) => string;
}

export type DefineFileTransformArgs = DefineFileTransformBase &
  (
    | { findingType: FindingType }
    | { fileTags?: FileTag[] | ((tags: FileTag[]) => boolean) }
  );

export function defineFileTransform(args: DefineFileTransformArgs): Transform {
  return defineTransform({
    name: args.name,
    apply: async (workspace, { onProgress } = {}) => {
      const { findings, tree } = workspace;

      const fileTags = 'fileTags' in args ? args.fileTags : undefined;

      const matchesFileTags = (tags: FileTag[]) =>
        fileTags == null
          ? true
          : Array.isArray(fileTags)
            ? fileTags.every((tag) => tags.includes(tag))
            : fileTags(tags);

      const taggedPaths =
        fileTags !== undefined
          ? workspace.files
              .filter((file) => matchesFileTags(file.tags))
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

      const paths =
        taggedPaths !== undefined && findingPaths !== undefined
          ? findingPaths.filter((path) => {
              const file = workspace.files.find(
                ({ path: filePath }) => filePath === path,
              );

              return file != null && matchesFileTags(file.tags);
            })
          : (taggedPaths ?? findingPaths ?? []);
      let transformedCount = 0;

      for (const path of paths) {
        const content = await tree.maybeReadFile(path);

        if (content != null) {
          await tree.write(path, args.apply(content));
          transformedCount++;
        }

        /* Give the opportunity to `clack` to intercept CTRL+C. */
        await yieldToEventLoop();
      }

      onProgress?.(`${transformedCount} file(s) transformed`);
    },
  });
}
