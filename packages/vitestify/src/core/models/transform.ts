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
  ): Promise<TransformResult>;
}

export interface TransformResult {
  verify?(): Promise<VerifyResult>;
}

export interface VerifyResult {
  rollback?(): Promise<void>;
}

export function createTransformResult(options?: {
  verify?(): Promise<VerifyResult>;
}): TransformResult {
  return { verify: options?.verify };
}

export function createVerifyResult(options?: {
  rollback?(): Promise<void>;
}): VerifyResult {
  return { rollback: options?.rollback };
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

      return createTransformResult();
    },
  });
}
