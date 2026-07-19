import type { WritableWorkspace } from '../domain/workspace';
import type { CommandRunner } from '../ports/command-runner';
import type { ActivityStep } from './progress-tracker/activity-step';
import type { TransformStep } from './progress-tracker/transform-step';

export interface TransformOptions {
  commandRunner: CommandRunner;
  workspace: WritableWorkspace;
  progressStep: TransformStep;
}

export interface Transform {
  name: string;
  apply(options: TransformOptions): Promise<void | TransformResult>;
}

export interface TransformResult {
  verify(options: VerifyOptions): Promise<void | VerifyResult>;
}

export interface VerifyResult {
  rollback(options: RollbackOptions): Promise<void>;
}

export interface VerifyOptions {
  activityStep: ActivityStep;
}

export interface RollbackOptions {
  activityStep: ActivityStep;
}

export function defineTransform(args: Transform): Transform {
  return args;
}
