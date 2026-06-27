import { describe, it } from 'vitest';
import { nxJestTargetTransform } from './nx-jest-target.transform';

describe('nxJestTargetTransform', () => {
  it.todo('renames test target to jest in project.json', () => {
    // arrange: workspace with project.json containing targets.test
    // act: run nxJestTargetTransform
    // assert: targets.jest exists with same config as former targets.test
    // assert: targets.test is removed
  });

  it.todo('skips when project.json has no test target', () => {
    // arrange: workspace with project.json without targets.test
    // act: run nxJestTargetTransform
    // assert: project.json is unchanged
  });
});
