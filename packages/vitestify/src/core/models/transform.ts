import type { Finding } from './finding';
import type { Workspace } from '../domain/workspace';

export interface TransformApplyArgs {
  findings: Finding[];
  workspace: Readonly<Workspace>;
}

export interface Transform {
  name: string;
  apply(args: TransformApplyArgs): Promise<void>;
}

export function defineTransform(args: Transform): Transform {
  return args;
}
