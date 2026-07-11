import { join } from 'node:path/posix';
import { defineTransform } from '../../../../core/models/transform';
import { relativePath } from '../../../../core/models/relative-path';

export const nxProjectJsonTransform = defineTransform({
  name: 'nx-project-json',
  apply: async (workspace) => {
    const { tree } = workspace;

    for (const project of workspace.getProjects()) {
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
    }
  },
});

interface ProjectJson {
  targets?: Record<string, unknown>;
}
