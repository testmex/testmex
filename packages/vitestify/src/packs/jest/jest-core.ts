import { FileTag } from '../../core/domain/workspace';
import {
  relativePath,
  type RelativePath,
} from '../../core/models/relative-path';
import { fileTags } from '../core/identifiers';
import {
  JEST_CTS_EXTENSION,
  JEST_TSX_EXTENSION,
  SPEC_TS_EXTENSION,
  SPEC_TSX_EXTENSION,
} from './constants';

/**
 * Filter test files that are not setup files.
 */
export function isTransformable(tags: FileTag[]): boolean {
  return (
    tags.some((tag) => [fileTags.code, fileTags.test].includes(tag)) &&
    !tags.includes(fileTags.jestSetup)
  );
}

export function renameSpecToJestFile(path: RelativePath): RelativePath | null {
  if (path.endsWith(SPEC_TSX_EXTENSION)) {
    return relativePath(
      path.slice(0, -SPEC_TSX_EXTENSION.length) + JEST_TSX_EXTENSION,
    );
  }

  if (path.endsWith(SPEC_TS_EXTENSION)) {
    return relativePath(
      path.slice(0, -SPEC_TS_EXTENSION.length) + JEST_CTS_EXTENSION,
    );
  }

  return null;
}

export function renameJestToSpecFile(path: RelativePath): RelativePath | null {
  if (path.endsWith(JEST_TSX_EXTENSION)) {
    return relativePath(
      path.slice(0, -JEST_TSX_EXTENSION.length) + SPEC_TSX_EXTENSION,
    );
  }

  if (path.endsWith(JEST_CTS_EXTENSION)) {
    return relativePath(
      path.slice(0, -JEST_CTS_EXTENSION.length) + SPEC_TS_EXTENSION,
    );
  }

  return null;
}
