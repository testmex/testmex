import { FileTag } from '../../core/domain/workspace';
import { fileTags } from '../core/identifiers';

/**
 * Filter test files that are not setup files.
 */
export function isTransformable(tags: FileTag[]): boolean {
  return (
    tags.some((tag) => [fileTags.code, fileTags.test].includes(tag)) &&
    !tags.includes(fileTags.jestSetup)
  );
}
