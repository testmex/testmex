import type { Workspace } from '../domain/workspace';

export interface Transform {
  name: string;
  apply(workspace: Workspace): Promise<void>;
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
    apply: async (workspace) => {
      for (const transform of transforms) {
        await transform.apply(workspace);
      }
    },
  });
}
