import type { WritableWorkspace } from '../domain/workspace';

export interface Transform {
  name: string;
  apply(
    workspace: WritableWorkspace,
    options?: {
      onProgress?(detail: string): void;
    },
  ): Promise<void>;
}

export function defineTransform(args: Transform): Transform {
  return args;
}

export function defineTransformGroup(
  name: string,
  transforms: readonly Transform[],
): Transform {
  return defineTransform({
    name,
    apply: async (workspace, { onProgress } = {}) => {
      for (const [index, transform] of transforms.entries()) {
        const step = index + 1;
        const total = transforms.length;

        await transform.apply(workspace, {
          onProgress: (detail) => {
            onProgress?.(`[${step}/${total}] ${transform.name} · ${detail}`);
          },
        });
      }
    },
  });
}
