import { join } from 'node:path/posix';
import { defineTransform } from '../../../core/models/transform';
import { relativePath } from '../../../core/models/relative-path';

export const nxJestTargetTransform = defineTransform({
  name: 'nx-jest-target',
  apply: async ({ workspace }) => {
    const { info, tree } = workspace;

    for (const project of info.projects) {
      const projectJsonPath = relativePath(join(project.path, 'project.json'));
      const content = await tree.maybeReadFile(projectJsonPath);

      if (content == null) {
        continue;
      }

      const projectJson: ProjectJson = JSON.parse(content);

      if (projectJson.targets?.test === undefined) {
        continue;
      }

      projectJson.targets.jest = projectJson.targets.test;
      delete projectJson.targets.test;

      await tree.write(projectJsonPath, JSON.stringify(projectJson, null, 2));
    }
  },
});

interface ProjectJson {
  targets?: Record<string, unknown>;
}
