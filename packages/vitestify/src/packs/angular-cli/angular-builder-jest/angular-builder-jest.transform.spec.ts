import { describe, it } from 'vitest';
import { angularBuilderJestTransform } from './angular-builder-jest.transform';

describe('angularBuilderJestTransform', () => {
  it.todo(
    'renames test target to jest when using @angular-builders/jest:run',
    () => {
      // arrange angular.json with a project whose architect.test builder is @angular-builders/jest:run
      // run angularBuilderJestTransform
      // assert architect.jest exists with the former test target configuration
      // assert architect.test no longer references @angular-builders/jest:run
    },
  );

  it.todo('creates a new test target that uses @analogjs/vitest-angular:test', () => {
    // arrange angular.json with a project whose architect.test builder is @angular-builders/jest:run
    // run angularBuilderJestTransform
    // assert architect.test.builder is @analogjs/vitest-angular:test
  });

  it.todo('installs @analogjs/vitest-angular when a jest builder target is migrated', () => {
    // arrange angular.json with a project whose architect.test builder is @angular-builders/jest:run
    // run angularBuilderJestTransform
    // assert workspace.commands includes package manager add -D @analogjs/vitest-angular
  });

  it.todo('skips projects whose test target does not use @angular-builders/jest:run', () => {
    // arrange angular.json with a project whose architect.test builder is @angular-devkit/build-angular:karma
    // run angularBuilderJestTransform
    // assert angular.json is unchanged
    // assert no install command was queued
  });
});
