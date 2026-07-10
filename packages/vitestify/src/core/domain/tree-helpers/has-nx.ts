import type { ReadonlyTree } from '../tree';
import { hasDependency } from './has-dependency';

export async function hasNx(tree: ReadonlyTree): Promise<boolean> {
  return hasDependency(tree, 'nx');
}
