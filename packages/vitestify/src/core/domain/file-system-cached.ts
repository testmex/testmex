import type { RelativePath } from '../models/relative-path';
import type { FileSystem } from '../ports/file-system';

/**
 * Caches reads from a delegate {@link FileSystem}.
 */
export class FileSystemCached implements FileSystem {
  private readonly _cache = new Map<RelativePath, string>();
  private readonly _inner: FileSystem;

  constructor(inner: FileSystem) {
    this._inner = inner;
  }

  async maybeReadFile(path: RelativePath): Promise<string | null> {
    const cached = this._cache.get(path);
    if (cached !== undefined) {
      return cached;
    }

    const content = await this._inner.maybeReadFile(path);
    if (content !== null) {
      this._cache.set(path, content);
      return content;
    }

    return null;
  }

  async scanDirectory(path?: RelativePath): Promise<RelativePath[]> {
    return this._inner.scanDirectory(path);
  }

  async writeFile(path: RelativePath, content: string): Promise<void> {
    await this._inner.writeFile(path, content);
    this._cache.set(path, content);
  }

  async deleteFile(path: RelativePath): Promise<void> {
    await this._inner.deleteFile(path);
    this._cache.delete(path);
  }
}
