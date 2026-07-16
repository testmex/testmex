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
