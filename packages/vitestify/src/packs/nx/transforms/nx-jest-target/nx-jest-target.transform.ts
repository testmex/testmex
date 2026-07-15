import { join } from 'node:path/posix';
import { defineTransform } from '../../../../core/models/transform';
import { relativePath } from '../../../../core/models/relative-path';

export const nxJestTargetTransform = defineTransform({
  name: 'nx-jest-target',
  apply: async (workspace, { onProgress }) => {
    const { tree } = workspace;
    let transformedCount = 0;

    for (const project of workspace.projects) {
      const projectJsonPath = relativePath(join(project.path, 'project.json'));
      const projectJson = await tree.maybeReadJsonFile<ProjectJson>(
        projectJsonPath,
      );

      if (projectJson == null) {
        continue;
      }

      if (projectJson.targets?.test === undefined) {
        continue;
      }

      projectJson.targets.jest = projectJson.targets.test;
      delete projectJson.targets.test;

      await tree.write(projectJsonPath, JSON.stringify(projectJson, null, 2));
      transformedCount++;
    }

    onProgress?.(`${transformedCount} file(s) transformed`);
  },
});

interface ProjectJson {
  targets?: Record<string, unknown>;
}
