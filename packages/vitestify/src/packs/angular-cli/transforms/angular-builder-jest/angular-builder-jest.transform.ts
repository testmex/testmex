import {
  createTransformResult,
  defineTransform,
} from '../../../../core/models/transform';
import {
  ANGULAR_BUILDERS_JEST_BUILDER,
  ANGULAR_JSON_PATH,
  type AngularJson,
} from '../../../core/angular-json';
const VITEST_ANGULAR_EXECUTOR_PACKAGE = '@analogjs/vitest-angular';
const VITEST_BUILDER = '@analogjs/vitest-angular:test';

export const angularBuilderJestTransform = defineTransform({
  name: 'angular-builder-jest',
  apply: async (workspace, { onProgress } = {}) => {
    const { commands, tree } = workspace;
    const originalAngularJson =
      await tree.maybeReadJsonFile<AngularJson>(ANGULAR_JSON_PATH);

    if (originalAngularJson == null) {
      return createTransformResult();
    }

    const devDependencies = new Set<string>();
    let angularJson = originalAngularJson;

    for (const [projectName, project] of Object.entries(
      originalAngularJson.projects ?? {},
    )) {
      const testTarget = project.architect?.test;

      if (testTarget?.builder !== ANGULAR_BUILDERS_JEST_BUILDER) {
        continue;
      }

      devDependencies.add(VITEST_ANGULAR_EXECUTOR_PACKAGE);
      angularJson = {
        ...angularJson,
        projects: {
          ...angularJson.projects,
          [projectName]: {
            ...project,
            architect: {
              ...project.architect,
              jest: testTarget,
              test: { builder: VITEST_BUILDER },
            },
          },
        },
      };
    }

    if (devDependencies.size > 0) {
      commands.add([workspace.packageManager, 'add', '-D', ...devDependencies]);
    }

    if (angularJson !== originalAngularJson) {
      await tree.write(ANGULAR_JSON_PATH, JSON.stringify(angularJson, null, 2));
      onProgress?.('1 file(s) transformed');
    }

    return createTransformResult();
  },
});
