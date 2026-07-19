import { join } from 'node:path/posix';
import { defineTransform } from '../../../../core/models/transform';
import { relativePath } from '../../../../core/models/relative-path';

export const nxProjectJsonTransform = defineTransform({
  name: 'nx-project-json',
  apply: async ({ workspace, progressStep }) => {
    const { tree } = workspace;
    let transformedCount = 0;

    for (const project of workspace.projects) {
      const projectJsonPath = relativePath(join(project.path, 'project.json'));
      const content = await tree.maybeReadFile(projectJsonPath);

      if (content == null) {
        continue;
      }

      const projectJson: ProjectJson = JSON.parse(content);

      if (projectJson.targets?.test === undefined) {
        continue;
      }

      delete projectJson.targets.test;

      await tree.write(projectJsonPath, JSON.stringify(projectJson, null, 2));
      transformedCount++;
    }

    progressStep.setTransformedFileCount(transformedCount);
  },
});

interface ProjectJson {
  targets?: Record<string, unknown>;
}
