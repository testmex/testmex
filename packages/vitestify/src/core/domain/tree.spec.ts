import { describe, expect, it } from 'vitest';
import { relativePath } from '../models/relative-path';
import { FileSystemFake } from '../ports/file-system.fake';
import { Tree } from '../domain/tree';

describe(Tree.name, () => {
  it('staged write is visible to subsequent reads without committing', async () => {
    const { fileSystem, tree } = setUp();

    fileSystem.configure({
      [relativePath('apps/my-app/src/app/app.component.spec.ts')]:
        'jest.mock("./app.service");\n\ndescribe("AppComponent", () => {});',
    });

    await tree.write(
      relativePath('apps/my-app/src/app/app.component.spec.ts'),
      'vi.mock("./app.service");\n\ndescribe("AppComponent", () => {});',
    );

    expect
      .soft(
        await tree.maybeReadFile(
          relativePath('apps/my-app/src/app/app.component.spec.ts'),
        ),
      )
      .toBe('vi.mock("./app.service");\n\ndescribe("AppComponent", () => {});');
    expect
      .soft(
        await fileSystem.maybeReadFile(
          relativePath('apps/my-app/src/app/app.component.spec.ts'),
        ),
      )
      .toBe(
        'jest.mock("./app.service");\n\ndescribe("AppComponent", () => {});',
      );
  });

  it('staged create is readable before commit', async () => {
    const { tree } = setUp();
    const mainPath = relativePath('apps/my-app/main.ts');

    await tree.write(mainPath, 'console.log("hello");');

    expect(await tree.maybeReadFile(mainPath)).toBe('console.log("hello");');
    expect(tree.changes()).toEqual([
      {
        type: 'create',
        path: 'apps/my-app/main.ts',
        content: 'console.log("hello");',
      },
    ]);
  });

  it('staged delete hides file from reads', async () => {
    const { fileSystem, tree } = setUp();
    const mainPath = relativePath('apps/my-app/main.ts');

    fileSystem.configure({
      [mainPath]: 'console.log("hello");',
    });

    tree.delete(mainPath);

    expect.soft(await tree.maybeReadFile(mainPath)).toBeNull();
    expect.soft(tree.changes()).toEqual([{ type: 'delete', path: mainPath }]);
    expect
      .soft(await fileSystem.maybeReadFile(mainPath))
      .toBe('console.log("hello");');
  });

  it('sequential writes to the same file compose', async () => {
    const { fileSystem, tree } = setUp();
    const mainPath = relativePath('apps/my-app/main.ts');

    fileSystem.configure({
      [mainPath]: 'console.log("hello");',
    });

    await tree.write(mainPath, 'console.log("world");');
    await tree.write(mainPath, 'console.log("good bye");');

    expect
      .soft(await tree.maybeReadFile(mainPath))
      .toBe('console.log("good bye");');
    expect.soft(tree.changes()).toEqual([
      {
        type: 'update',
        path: 'apps/my-app/main.ts',
        content: 'console.log("good bye");',
      },
    ]);
  });

  it('rename via `originalPath` on write', async () => {
    const { fileSystem, tree } = setUp();
    const mainPath = relativePath('apps/my-app/main.ts');

    fileSystem.configure({
      [mainPath]: 'console.log("hello");',
    });
    await tree.write(mainPath, 'console.log("good bye");');

    await tree.rename(mainPath, relativePath('apps/my-app/main-moved.ts'));

    expect.soft(tree.changes()).toEqual([
      {
        type: 'update',
        path: 'apps/my-app/main-moved.ts',
        content: 'console.log("good bye");',
        originalPath: 'apps/my-app/main.ts',
      },
    ]);
    expect.soft(await tree.maybeReadFile(mainPath)).toBeNull();
    expect
      .soft(await tree.maybeReadFile(relativePath('apps/my-app/main-moved.ts')))
      .toBe('console.log("good bye");');
  });

  it('`commit()` flushes all staged changes to FileSystem', async () => {
    const { fileSystem, tree } = setUp();
    const mainPath = relativePath('apps/my-app/main.ts');
    const jestConfigPath = relativePath('apps/my-app/jest.config.ts');

    fileSystem.configure({
      [mainPath]: 'console.log("hello");',
    });

    await tree.write(mainPath, 'console.log("good bye");');
    tree.delete(jestConfigPath);

    await tree.commit();

    expect
      .soft(await fileSystem.maybeReadFile(mainPath))
      .toBe('console.log("good bye");');
    expect.soft(await fileSystem.maybeReadFile(jestConfigPath)).toBeNull();
    expect.soft(tree.changes()).toEqual([]);
  });
});

function setUp() {
  const fileSystem = new FileSystemFake();

  return {
    fileSystem,
    tree: new Tree({ fileSystem }),
  };
}
