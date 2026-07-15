import type { WritableWorkspace } from '../domain/workspace';
import type { CommandRunner } from '../ports/command-runner';

export interface Transform {
  name: string;
  apply(
    workspace: WritableWorkspace,
    options?: {
      commandRunner?: CommandRunner;
      onProgress?(detail: string): void;
    },
  ): Promise<void | TransformResult>;
}

export interface TransformResult {
  verify(): Promise<void | VerifyResult>;
}

export interface VerifyResult {
  rollback(): Promise<void>;
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
    apply: async (workspace, { commandRunner, onProgress } = {}) => {
      for (const [index, transform] of transforms.entries()) {
        const step = index + 1;
        const total = transforms.length;

        await transform.apply(workspace, {
          commandRunner,
          onProgress: (detail) => {
            onProgress?.(`[${step}/${total}] ${transform.name} · ${detail}`);
          },
        });
      }
    },
  });
}
