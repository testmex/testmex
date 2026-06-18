import type { FindingType } from '../models/finding';
import { defineTransform, type Transform } from '../models/transform';

export interface DefineFileTransformArgs {
  findingType: FindingType;
  apply: (content: string) => string;
}

export function defineFileTransform(args: DefineFileTransformArgs): Transform {
  return defineTransform({
    apply: async ({ findings, workspace }) => {
      const { tree } = workspace;

      for (const finding of findings) {
        if (
          finding.type !== args.findingType ||
          finding.file === undefined
        ) {
          continue;
        }

        const content = await tree.maybeReadFile(finding.file.path);

        if (content != null) {
          await tree.write(finding.file.path, args.apply(content));
        }
      }
    },
  });
}
