import { describe, expect, it } from 'vitest';
import { relativePath } from './relative-path';
import { FileSystemFake } from '../infra/file-system.fake';
import { Tree } from './tree';

describe(Tree.name, () => {
  it('staged write is visible to subsequent reads without committing', async () => {
    const { fileSystem, tree } = setUp();

    fileSystem.configure({
      [relativePath('src/app.spec.ts')]: 'jest.mock("./foo")',
    });

    tree.write(relativePath('src/app.spec.ts'), 'vi.mock("./foo")');

    expect(
      await tree.maybeReadFile(relativePath('src/app.spec.ts')),
    ).toBe('vi.mock("./foo")');
    expect(
      await fileSystem.maybeReadFile(relativePath('src/app.spec.ts')),
    ).toBe('jest.mock("./foo")');
  });

  it.todo('staged create is readable before commit', () => {
    // Arrange: a `Tree` over an empty `FileSystemFake`.
    // Act: `tree.write(newPath, content)`.
    // Assert: `tree.maybeReadFile(newPath)` returns `content`; `changes()` has one `create`.
  });

  it.todo('staged delete hides file from reads', () => {
    // Arrange: a `Tree` over a `FileSystemFake` with one file.
    // Act: `tree.delete(path)`.
    // Assert: `tree.maybeReadFile(path)` is null; `changes()` has one `delete`; `FileSystemFake` still has the file until commit.
  });

  it.todo('sequential writes to the same file compose', () => {
    // Arrange: a `Tree` with an existing file.
    // Act: `tree.write(path, 'first')` then `tree.write(path, 'second')`.
    // Assert: `tree.maybeReadFile(path)` returns `'second'`; `changes()` has one `update`.
  });

  it.todo('rename via `originalPath` on write', () => {
    // Arrange: a `Tree` with `old/path.ts` on disk.
    // Act: `tree.write('new/path.ts', content, { originalPath: 'old/path.ts' })`.
    // Assert: `changes()` has one `update` with `path: 'new/path.ts'` and `originalPath: 'old/path.ts'`; `tree.maybeReadFile('old/path.ts')` is null and `tree.maybeReadFile('new/path.ts')` returns `content`.
  });

  it.todo('`commit()` flushes all staged changes to FileSystem', () => {
    // Arrange: a `Tree` with staged create, update, and delete.
    // Act: `tree.commit()`.
    // Assert: `FileSystemFake` reflects all three operations; `changes()` is empty afterward.
  });
});

function setUp() {
  const fileSystem = new FileSystemFake();

  return {
    fileSystem,
    tree: new Tree({ fileSystem }),
  };
}
