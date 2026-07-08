import {
  type RelativePath,
} from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';
import type { WritableWorkspace } from '../../../core/domain/workspace';
import { fileTags } from '../identifiers';

export const setupFilesTransform = defineTransform({
  name: 'setup-files',
  apply: _applySetupFilesTransform,
});

/**
 * @deprecated 🚧 work in progress
 */
async function _applySetupFilesTransform(
  _workspace: WritableWorkspace,
): Promise<void> {
  throw new Error('🚧 work in progress');
}

/**
 * @deprecated 🚧 work in progress
 */
export function vitestSetupFilePath(
  jestSetupFilePath: RelativePath,
): RelativePath {
  throw new Error('🚧 work in progress');
}

/**
 * @deprecated 🚧 work in progress
 */
export function isJestSetupFile(tags: readonly string[]): boolean {
  return tags.includes(fileTags.jestSetup);
}
