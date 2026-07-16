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
    apply: async ({ workspace, progressStep }) => {
      const { tree } = workspace;
      let transformedCount = 0;
      progressStep.updateMessage(`0 file(s) transformed`);

      for (const file of workspace.files) {
        if (!_shouldTransform(file, args)) {
          continue;
        }

        const content = await tree.maybeReadFile(file.path);

        if (content != null) {
          const updatedContent = args.apply(content);

          /* Do not count unchanged files. */
          if (updatedContent !== content) {
            await tree.write(file.path, updatedContent);
            transformedCount++;
          }
        }

        /* Give a run opportunity to things like `clack` intercepting CTRL+C. */
        await yieldToEventLoop();
      }

      progressStep.updateMessage(`${transformedCount} file(s) transformed`);
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
