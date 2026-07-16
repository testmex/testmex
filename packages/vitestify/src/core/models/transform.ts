import type { WritableWorkspace } from '../domain/workspace';
import type { Step } from '../ports/progress-reporter';
import type { PipelineContext } from './pipeline-context';

export interface TransformOptions extends PipelineContext {
  workspace: WritableWorkspace;
}

export interface Transform {
  name: string;
  apply(options: TransformOptions): Promise<void | TransformResult>;
}

export interface TransformResult {
  verify(options: { progressStep: Step }): Promise<void | VerifyResult>;
}

export interface VerifyResult {
  rollback(options: { progressStep: Step }): Promise<void>;
}

export function defineTransform(args: Transform): Transform {
  return args;
}
