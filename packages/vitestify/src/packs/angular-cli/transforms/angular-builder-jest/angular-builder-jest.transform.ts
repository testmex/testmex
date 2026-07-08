import { defineTransform } from '../../../../core/models/transform';
import { ANGULAR_JSON_PATH, type AngularJson } from '../../angular-json';

const JEST_BUILDER = '@angular-builders/jest:run';
const VITEST_ANGULAR_EXECUTOR_PACKAGE = '@analogjs/vitest-angular';
const VITEST_BUILDER = '@analogjs/vitest-angular:test';

export const angularBuilderJestTransform = defineTransform({
  name: 'angular-builder-jest',
  apply: async (workspace) => {
    const { commands, info, tree } = workspace;
    const originalAngularJson =
      await tree.maybeReadJsonFile<AngularJson>(ANGULAR_JSON_PATH);

    if (originalAngularJson == null) {
      return;
    }

    const devDependencies = new Set<string>();
    let angularJson = originalAngularJson;

    for (const [projectName, project] of Object.entries(
      originalAngularJson.projects ?? {},
    )) {
      const testTarget = project.architect?.test;

      if (testTarget?.builder !== JEST_BUILDER) {
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
      commands.add([info.packageManager, 'add', '-D', ...devDependencies]);
    }

    if (angularJson !== originalAngularJson) {
      await tree.write(
        ANGULAR_JSON_PATH,
        JSON.stringify(angularJson, null, 2),
      );
    }
  },
});
