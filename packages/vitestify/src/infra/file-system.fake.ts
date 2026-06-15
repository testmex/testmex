import type { RelativePath } from '../../core/core';
import { FileSystem } from './file-system';

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

  async readFile(path: RelativePath): Promise<string> {
    const content = this._files.get(path)
    if (content === undefined) {
      throw new Error(`FileSystemFake: file not found "${path}"`)
    }
    return content;
  }

  async scanDirectory(path: RelativePath): Promise<RelativePath[]> {
    const files = Array.from(this._files.keys());

    if (!path) {
      return files;
    }

    const prefix = `${path}/`;
    return files.filter((file) => file.startsWith(prefix));
  }
}
