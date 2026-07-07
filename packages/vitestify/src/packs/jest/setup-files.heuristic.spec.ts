import { describe, it } from 'vitest';

describe('setupFilesHeuristic', () => {
  it.todo('tags setup file referenced in setupFilesAfterEnv when it exists', () => {
    // given jest.config.ts with setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']
    // and apps/my-app/src/test-setup.ts exists
    // when setup files heuristic runs
    // assert apps/my-app/src/test-setup.ts is tagged as jest-setup
  });

  it.todo('tags setup file referenced in setupFiles when it exists', () => {
    // given jest.config.ts with setupFiles: ['<rootDir>/src/test-setup.ts']
    // and apps/my-app/src/test-setup.ts exists
    // when setup files heuristic runs
    // assert apps/my-app/src/test-setup.ts is tagged as jest-setup
  });

  it.todo('does not tag a file that is not referenced in jest config', () => {
    // given apps/my-app/src/test-setup.ts exists
    // and jest.config.ts does not reference it in setupFiles or setupFilesAfterEnv
    // when setup files heuristic runs
    // assert apps/my-app/src/test-setup.ts is not tagged as jest-setup
  });
});
