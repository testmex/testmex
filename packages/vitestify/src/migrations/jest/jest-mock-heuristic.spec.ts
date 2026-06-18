import { describe, it } from 'vitest';
import { JestMockHeuristic } from './jest-mock-heuristic';

describe(JestMockHeuristic.name, () => {
  it.todo('heuristic detects `jest.mock` usage', () => {
    // Arrange: a Workspace whose test file contains jest.mock('./foo').
    // Act: run the heuristic.
    // Assert: returns a result of type jest-mock-call with tag "jest".
  });
});
