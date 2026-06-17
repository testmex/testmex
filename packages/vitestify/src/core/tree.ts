import type { Change } from './change';
import type { RelativePath } from './relative-path';
import type { FileSystem } from '../infra/file-system';

export class Tree {
  private readonly _fileSystem: FileSystem;
  private readonly _staged = new Map<RelativePath, string>();
  private readonly _cache = new Map<RelativePath, string>();
  private readonly _deleted = new Set<RelativePath>();
  private readonly _changesByPath = new Map<RelativePath, Change>();

  constructor(args: { fileSystem: FileSystem }) {
    this._fileSystem = args.fileSystem;
  }

  async maybeReadFile(path: RelativePath): Promise<string | null> {
    if (this._deleted.has(path)) {
      return null;
    }

    const staged = this._staged.get(path);
    if (staged !== undefined) {
      return staged;
    }

    const cached = this._cache.get(path);
    if (cached !== undefined) {
      return cached;
    }

    const content = await this._fileSystem.maybeReadFile(path);
    if (content !== null) {
      this._cache.set(path, content);
    }

    return content;
  }

  async write(path: RelativePath, content: string): Promise<void> {
    const existing = this._changesByPath.get(path);
    const wasStaged = this._staged.has(path);

    this._deleted.delete(path);
    this._staged.set(path, content);

    if (existing?.type === 'create' && wasStaged) {
      this._changesByPath.set(path, { type: 'update', path, content });
      return;
    }

    if (existing?.type === 'create') {
      this._changesByPath.set(path, { type: 'create', path, content });
      return;
    }

    if (existing?.type === 'update') {
      this._changesByPath.set(path, { type: 'update', path, content });
      return;
    }

    const existsOnDisk = await this.existsOnDisk(path);

    if (existsOnDisk) {
      this._changesByPath.set(path, { type: 'update', path, content });
      return;
    }

    this._changesByPath.set(path, { type: 'create', path, content });
  }

  rename(originalPath: RelativePath, newPath: RelativePath): void {
    const content =
      this._staged.get(originalPath) ?? this._cache.get(originalPath);
    if (content === undefined) {
      throw new Error(`Tree: cannot rename missing file "${originalPath}"`);
    }

    this._staged.delete(originalPath);
    this._staged.set(newPath, content);
    this._deleted.add(originalPath);
    this._changesByPath.delete(originalPath);
    this._changesByPath.set(newPath, {
      type: 'update',
      path: newPath,
      content,
      originalPath,
    });
  }

  delete(path: RelativePath): void {
    this._deleted.add(path);
    this._staged.delete(path);
    this._changesByPath.set(path, { type: 'delete', path });
  }

  changes(): Change[] {
    return Array.from(this._changesByPath.values());
  }

  async commit(): Promise<void> {
    for (const change of this.changes()) {
      if (change.type === 'delete') {
        await this._fileSystem.deleteFile(change.path);
        continue;
      }

      await this._fileSystem.writeFile(change.path, change.content);

      if (change.type === 'update' && change.originalPath !== undefined) {
        await this._fileSystem.deleteFile(change.originalPath);
      }
    }

    this._staged.clear();
    this._deleted.clear();
    this._changesByPath.clear();
    this._cache.clear();
  }

  private async existsOnDisk(path: RelativePath): Promise<boolean> {
    if (this._cache.has(path)) {
      return true;
    }

    const content = await this._fileSystem.maybeReadFile(path);
    if (content !== null) {
      this._cache.set(path, content);
      return true;
    }

    return false;
  }
}
