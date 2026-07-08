import { defineTransform } from '../../../core/models/transform';
import type { WritableWorkspace } from '../../../core/domain/workspace';
import { fileTags } from '../identifiers';
import { vitestSetupFilePath as toVitestSetupFilePath } from '../utils';

export const setupFilesTransform = defineTransform({
  name: 'setup-files',
  apply: _applySetupFilesTransform,
});

async function _applySetupFilesTransform(
  workspace: WritableWorkspace,
): Promise<void> {
  for (const file of workspace.getFiles()) {
    if (!isJestSetupFile(file.tags)) {
      continue;
    }

    const vitestPath = toVitestSetupFilePath(file.path);
    const existingClone = await workspace.tree.maybeReadFile(vitestPath);

    if (existingClone != null) {
      continue;
    }

    const content = await workspace.tree.maybeReadFile(file.path);

    if (content == null) {
      continue;
    }

    workspace.tree.write(vitestPath, content);
    workspace.tag(vitestPath, fileTags.code);
  }
}

export function isJestSetupFile(tags: readonly string[]): boolean {
  return tags.includes(fileTags.jestSetup);
}
