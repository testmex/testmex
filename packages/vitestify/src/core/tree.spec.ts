import { describe, it } from 'vitest';
import { Tree } from './tree';

describe(Tree.name, () => {
  it.todo('staged write is visible to subsequent reads without committing', () => {
    // Arrange: a `Tree` over a `FileSystemFake` with an existing file.
    // Act: `tree.write(path, newContent)` then `tree.read(path)`.
    // Assert: `read` returns `newContent`; `FileSystemFake` still has the original content.
  });

  it.todo('staged create is readable before commit', () => {
    // Arrange: a `Tree` over an empty `FileSystemFake`.
    // Act: `tree.write(newPath, content)`.
    // Assert: `tree.exists(newPath)` is true; `tree.read(newPath)` returns `content`; `changes()` has one `create`.
  });

  it.todo('staged delete hides file from reads', () => {
    // Arrange: a `Tree` over a `FileSystemFake` with one file.
    // Act: `tree.delete(path)`.
    // Assert: `tree.exists(path)` is false; `changes()` has one `delete`; `FileSystemFake` still has the file until commit.
  });

  it.todo('sequential writes to the same file compose', () => {
    // Arrange: a `Tree` with an existing file.
    // Act: `tree.write(path, 'first')` then `tree.write(path, 'second')`.
    // Assert: `tree.read(path)` returns `'second'`; `changes()` has one `update`.
  });

  it.todo('rename via `originalPath` on write', () => {
    // Arrange: a `Tree` with `old/path.ts` on disk.
    // Act: `tree.write('new/path.ts', content, { originalPath: 'old/path.ts' })`.
    // Assert: `changes()` has one `update` with `path: 'new/path.ts'` and `originalPath: 'old/path.ts'`; `tree.exists('old/path.ts')` is false and `tree.read('new/path.ts')` returns `content`.
  });

  it.todo('`commit()` flushes all staged changes to FileSystem', () => {
    // Arrange: a `Tree` with staged create, update, and delete.
    // Act: `tree.commit()`.
    // Assert: `FileSystemFake` reflects all three operations; `changes()` is empty afterward.
  });
});
