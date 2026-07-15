import type { WritableWorkspace } from '../domain/workspace';
import type { PipelineContext } from './pipeline-context';

export interface TransformOptions extends PipelineContext {
  workspace: WritableWorkspace;
}

export interface Transform {
  name: string;
  apply(options: TransformOptions): Promise<void | TransformResult>;
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
    apply: async (options) => {
      for (const [index, transform] of transforms.entries()) {
        const step = index + 1;
        const total = transforms.length;

        await transform.apply({
          ...options,
          onProgress: (detail) => {
            options.onProgress(
              `[${step}/${total}] ${transform.name} · ${detail}`,
            );
          },
        });
      }
    },
  });
}
