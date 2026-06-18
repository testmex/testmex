import { describe, it } from 'vitest';

describe('transforms', () => {
  it.todo('rewrites `jest.mock` to `vi.mock` via the Tree', () => {
    // Arrange: a `Tree` whose test file contains `jest.mock('./foo')`; a matching finding.
    // Act: apply the transform with the `Tree` and finding.
    // Assert: `tree.maybeReadFile(path)` now contains `vi.mock('./foo')`.
  });
});
