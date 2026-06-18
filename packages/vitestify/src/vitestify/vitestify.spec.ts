import { describe, it } from 'vitest';
import { Vitestify } from './vitestify';

describe(Vitestify.name, () => {
  it.todo('applies transforms and commits', () => {
    // Arrange: set up a workspace with a jest config and a test file using `jest.mock`.
    // Act: run Vitestify.
    // Assert: after commit, the test file is rewritten on disk.
  });
});
