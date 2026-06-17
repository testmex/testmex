import type { Change } from './change';
import type { RelativePath } from './relative-path';
import type { FileSystem } from '../infra/file-system';

export class Tree {
  private readonly _fileSystem: FileSystem;
  private readonly _staged = new Map<RelativePath, string>();
  private readonly _cache = new Map<RelativePath, string>();

  constructor(args: { fileSystem: FileSystem }) {
    this._fileSystem = args.fileSystem;
  }

  /**
   * @deprecated 🚧 work in progress
   */
  async exists(path: RelativePath): Promise<boolean> {
    throw new Error('🚧 work in progress');
  }

  async read(path: RelativePath): Promise<string> {
    const staged = this._staged.get(path);
    if (staged !== undefined) {
      return staged;
    }

    const cached = this._cache.get(path);
    if (cached !== undefined) {
      return cached;
    }

    const content = await this._fileSystem.maybeReadFile(path);
    if (content === null) {
      throw new Error(`Tree: file not found "${path}"`);
    }

    this._cache.set(path, content);
    return content;
  }

  write(
    path: RelativePath,
    content: string,
    _options?: { originalPath?: RelativePath },
  ): void {
    this._staged.set(path, content);
  }

  /**
   * @deprecated 🚧 work in progress
   */
  delete(path: RelativePath): void {
    throw new Error('🚧 work in progress');
  }

  /**
   * @deprecated 🚧 work in progress
   */
  changes(): Change[] {
    throw new Error('🚧 work in progress');
  }

  /**
   * @deprecated 🚧 work in progress
   */
  async commit(): Promise<void> {
    throw new Error('🚧 work in progress');
  }
}
