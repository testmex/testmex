import { relativePath } from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';

const ANGULAR_JSON_PATH = relativePath('angular.json');
const JEST_BUILDER = '@angular-builders/jest:run';
const VITEST_ANGULAR_PACKAGE = '@analogjs/vitest-angular';
const VITEST_BUILDER = '@analogjs/vitest-angular:test';

export const angularBuilderJestTransform = defineTransform({
  name: 'angular-builder-jest',
  apply: async (workspace) => {
    throw new Error('🚧 Work in progress!');
  },
});
