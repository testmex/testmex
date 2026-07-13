import type { FindingType } from '../models/finding';
import { defineTransform, type Transform } from '../models/transform';
import type { FileInfo, FileTag } from './workspace';
import { yieldToEventLoop } from '../utils/yield-to-event-loop';

export interface DefineFileTransformArgs {
  name: string;
  apply: (content: string) => string;
  fileTags?: FileTag[] | ((tags: FileTag[]) => boolean);
  findingType?: FindingType;
}

export function defineFileTransform(args: DefineFileTransformArgs): Transform {
  return defineTransform({
    name: args.name,
    apply: async (workspace, { onProgress } = {}) => {
      const { tree } = workspace;
      const hasFileTagsFilter = args.fileTags !== undefined;
      const hasFindingFilter = args.findingType !== undefined;

      if (!hasFileTagsFilter && !hasFindingFilter) {
        onProgress?.('0 file(s) transformed');
        return;
      }

      let transformedCount = 0;

      for (const file of workspace.files) {
        if (!_shouldTransform(file, args)) {
          continue;
        }

        const content = await tree.maybeReadFile(file.path);

        if (content != null) {
          await tree.write(file.path, args.apply(content));
          transformedCount++;
        }

        /* Give the opportunity to `clack` to intercept CTRL+C. */
        await yieldToEventLoop();
      }

      onProgress?.(`${transformedCount} file(s) transformed`);
    },
  });
}

function _shouldTransform(
  file: FileInfo,
  { fileTags, findingType }: DefineFileTransformArgs,
): boolean {
  if (findingType !== undefined && !file.findings.includes(findingType)) {
    return false;
  }

  if (fileTags !== undefined && !_matchesFileTags(file.tags, fileTags)) {
    return false;
  }

  return fileTags !== undefined || findingType !== undefined;
}

function _matchesFileTags(
  tags: FileTag[],
  fileTags: FileTag[] | ((tags: FileTag[]) => boolean),
): boolean {
  return Array.isArray(fileTags)
    ? fileTags.every((tag) => tags.includes(tag))
    : fileTags(tags);
}
