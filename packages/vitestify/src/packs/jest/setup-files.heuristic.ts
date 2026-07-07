import type { FileInfo, ReadonlyWorkspace } from '../../core/domain/workspace';
import { defineHeuristic } from '../../core/models/heuristic';
import type { RelativePath } from '../../core/models/relative-path';

const JEST_SETUP_FILE_KEYS = ['setupFiles', 'setupFilesAfterEnv'] as const;

/**
 * @deprecated 🚧 work in progress
 */
export function parseSetupFilePaths(jestConfigContent: string): string[] {
  throw new Error('🚧 work in progress');
}

/**
 * @deprecated 🚧 work in progress
 */
export function resolveSetupFileRelativePath(
  setupFilePath: string,
  jestConfigDirectory: RelativePath,
): RelativePath {
  throw new Error('🚧 work in progress');
}

/**
 * @deprecated 🚧 work in progress
 */
export async function discoverJestSetupFileInfos(
  workspace: ReadonlyWorkspace,
): Promise<FileInfo[]> {
  throw new Error('🚧 work in progress');
}

export const setupFilesHeuristic = defineHeuristic({
  inspect: async (_workspace) => {
    return [];
  },
});
