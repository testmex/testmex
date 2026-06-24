import type { RelativePath } from '../models/relative-path';
import type { FileSystem } from './file-system';

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

  async scanDirectory(path?: RelativePath): Promise<RelativePath[]> {
    const files = Array.from(this._files.keys());

    if (!path) {
      return files;
    }

    const prefix = `${path}/`;
    return files.filter((file) => file.startsWith(prefix));
  }

  async writeFile(path: RelativePath, content: string): Promise<void> {
    this._files.set(path, content);
  }

  async deleteFile(path: RelativePath): Promise<void> {
    this._files.delete(path);
  }
}
