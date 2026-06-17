import type { Change } from './change';
import type { RelativePath } from './relative-path';
import type { FileSystem } from '../infra/file-system';
import { CachedFileSystem } from '../infra/cached-file-system';

export class Tree {
  private readonly _cachedFileSystem: CachedFileSystem;
  private readonly _state = new TreeState();

  constructor({ fileSystem }: { fileSystem: FileSystem }) {
    this._cachedFileSystem = new CachedFileSystem(fileSystem);
  }

  async maybeReadFile(path: RelativePath): Promise<string | null> {
    if (this._state.deleted.has(path)) {
      return null;
    }

    return (
      this._state.staged.get(path) ?? this._cachedFileSystem.maybeReadFile(path)
    );
  }

  async write(path: RelativePath, content: string): Promise<void> {
    this._state.deleted.delete(path);
    this._state.staged.set(path, content);

    const existsOnDisk =
      (await this._cachedFileSystem.maybeReadFile(path)) !== null;

    if (existsOnDisk) {
      this._state.changes.set(path, { type: 'update', path, content });
      return;
    }

    this._state.changes.set(path, { type: 'create', path, content });
  }

  async rename(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): Promise<void> {
    const content =
      this._state.staged.get(originalPath) ??
      (await this._cachedFileSystem.maybeReadFile(originalPath));
    if (content === null) {
      throw new Error(`Tree: cannot rename missing file "${originalPath}"`);
    }

    this._state.staged.delete(originalPath);
    this._state.staged.set(newPath, content);
    this._state.deleted.add(originalPath);
    this._state.changes.delete(originalPath);
    this._state.changes.set(newPath, {
      type: 'update',
      path: newPath,
      content,
      originalPath,
    });
  }

  delete(path: RelativePath): void {
    this._state.deleted.add(path);
    this._state.staged.delete(path);
    this._state.changes.set(path, { type: 'delete', path });
  }

  changes(): Change[] {
    return Array.from(this._state.changes.values());
  }

  async commit(): Promise<void> {
    for (const change of this._state.changes.values()) {
      if (change.type === 'delete') {
        await this._cachedFileSystem.deleteFile(change.path);
        continue;
      }

      await this._cachedFileSystem.writeFile(change.path, change.content);

      if (change.type === 'update' && change.originalPath !== undefined) {
        await this._cachedFileSystem.deleteFile(change.originalPath);
      }
    }

    this._state.clear();
  }
}

class TreeState {
  readonly staged = new Map<RelativePath, string>();
  readonly deleted = new Set<RelativePath>();
  readonly changes = new Map<RelativePath, Change>();

  clear(): void {
    this.staged.clear();
    this.deleted.clear();
    this.changes.clear();
  }
}
