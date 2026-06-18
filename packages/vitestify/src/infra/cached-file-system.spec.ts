import { describe, expect, it } from 'vitest';
import { relativePath } from '../core/models/relative-path';
import { CachedFileSystem } from '../core/domain/cached-file-system';
import { FileSystemFake } from '../core/ports/file-system.fake';

describe(CachedFileSystem.name, () => {
  it('caches file reads', async () => {
    const inner = new CountingFileSystemFake();
    inner.configure({
      [relativePath('apps/my-app/main.ts')]: 'console.log("hello");',
    });
    const fileSystem = new CachedFileSystem(inner);

    expect
      .soft(await fileSystem.maybeReadFile(relativePath('apps/my-app/main.ts')))
      .toBe('console.log("hello");');
    expect
      .soft(await fileSystem.maybeReadFile(relativePath('apps/my-app/main.ts')))
      .toBe('console.log("hello");');
    expect.soft(inner.readCount).toBe(1);
  });

  it('updates cache on write', async () => {
    const inner = new FileSystemFake();
    const fileSystem = new CachedFileSystem(inner);

    await fileSystem.writeFile(
      relativePath('apps/my-app/main.ts'),
      'console.log("hello");',
    );

    expect
      .soft(await fileSystem.maybeReadFile(relativePath('apps/my-app/main.ts')))
      .toBe('console.log("hello");');
    expect
      .soft(await inner.maybeReadFile(relativePath('apps/my-app/main.ts')))
      .toBe('console.log("hello");');
  });

  it('invalidates cache on delete', async () => {
    const inner = new FileSystemFake();
    inner.configure({
      [relativePath('apps/my-app/main.ts')]: 'console.log("hello");',
    });
    const fileSystem = new CachedFileSystem(inner);

    await fileSystem.maybeReadFile(relativePath('apps/my-app/main.ts'));
    await fileSystem.deleteFile(relativePath('apps/my-app/main.ts'));

    expect(
      await fileSystem.maybeReadFile(relativePath('apps/my-app/main.ts')),
    ).toBeNull();
  });
});

class CountingFileSystemFake extends FileSystemFake {
  readCount = 0;

  override async maybeReadFile(
    path: Parameters<FileSystemFake['maybeReadFile']>[0],
  ) {
    this.readCount++;
    return super.maybeReadFile(path);
  }
}
