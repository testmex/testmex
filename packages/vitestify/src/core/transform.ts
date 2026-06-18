import type { Finding } from './finding';
import type { Tree } from './tree';

export type TransformFactory = (args: { tree: Tree }) => Transform;

export interface Transform {
  apply(findings: Finding[]): Promise<void>;
}
