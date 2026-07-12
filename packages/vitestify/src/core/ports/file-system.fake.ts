import micromatch from 'micromatch';
import type { RelativePath } from '../models/relative-path';
import type { FileSystem, ScanDirectoryOptions } from './file-system';

export class FileSystemFake implements FileSystem {
  private readonly _files = new Map<RelativePath, string>();

  configure(entries: Record<RelativePath, string>): void {
    this._files.clear();
    for (const [path, content] of Object.entries(entries)) {
      this._files.set(path as RelativePath, content);
    }
  }

  async maybeReadFile(path: RelativePath): Promise<string | null> {
    return this._files.get(path) ?? null;
  }

  async *scanDirectory(
    options?: ScanDirectoryOptions,
  ): AsyncIterable<RelativePath> {
    const root = options?.root;
    const pattern = options?.pattern ?? '**/*';

    for (const file of this._files.keys()) {
      if (root && !file.startsWith(`${root}/`)) {
        continue;
      }

      const pathToMatch = root ? file.slice(root.length + 1) : file;

      if (!micromatch.isMatch(pathToMatch, pattern)) {
        continue;
      }

      yield file;
    }
  }

  async writeFile(path: RelativePath, content: string): Promise<void> {
    this._files.set(path, content);
  }

  async deleteFile(path: RelativePath): Promise<void> {
    this._files.delete(path);
  }
}
