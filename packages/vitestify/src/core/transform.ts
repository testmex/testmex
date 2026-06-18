import type { Finding } from './finding';
import type { Tree } from './tree';

export interface Transform {
  apply(tree: Tree, findings: Finding[]): Promise<void>;
}
