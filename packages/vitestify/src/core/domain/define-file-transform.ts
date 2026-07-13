import type { FindingType } from '../models/finding';
import { defineTransform, type Transform } from '../models/transform';
import type { FileInfo, FileTag } from './workspace';
import { yieldToEventLoop } from '../utils/yield-to-event-loop';

interface DefineFileTransformBase {
  name: string;
  apply: (content: string) => string;
}

export type DefineFileTransformTags =
  | FileTag[]
  | ((tags: FileTag[]) => boolean);

export type DefineFileTransformArgs = DefineFileTransformBase &
  (
    | {
        fileTags: DefineFileTransformTags;
        findingType?: FindingType;
      }
    | {
        findingType: FindingType;
        fileTags?: DefineFileTransformTags;
      }
  );

export function defineFileTransform(args: DefineFileTransformArgs): Transform {
  return defineTransform({
    name: args.name,
    apply: async (workspace, { onProgress } = {}) => {
      const { tree } = workspace;
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

  return true;
}

function _matchesFileTags(
  tags: FileTag[],
  fileTags: DefineFileTransformTags,
): boolean {
  return Array.isArray(fileTags)
    ? fileTags.every((tag) => tags.includes(tag))
    : fileTags(tags);
}

// @ts-expect-error requires fileTags or findingType
const _invalidConfig: DefineFileTransformArgs = {
  name: 'invalid',
  apply: (content: string) => content,
};

void _invalidConfig;
