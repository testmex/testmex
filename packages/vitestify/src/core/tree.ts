import { CachedFileSystem } from '../infra/cached-file-system';
import type { FileSystem } from '../infra/file-system';
import type { RelativePath } from './relative-path';

export class Tree {
  private readonly _cachedFileSystem: CachedFileSystem;
  private readonly _fileStates = new Map<RelativePath, FileState>();

  constructor({ fileSystem }: { fileSystem: FileSystem }) {
    this._cachedFileSystem = new CachedFileSystem(fileSystem);
  }

  async maybeReadFile(path: RelativePath): Promise<string | null> {
    const state = this._fileStates.get(path);

    if (this._isDeletedOrRenamed(state)) {
      return null;
    }

    if (state?.type === 'create' || state?.type === 'update') {
      return state.content;
    }

    return this._cachedFileSystem.maybeReadFile(path);
  }

  async write(path: RelativePath, content: string): Promise<void> {
    const exists = (await this._cachedFileSystem.maybeReadFile(path)) !== null;

    this._fileStates.set(path, {
      type: exists ? 'update' : 'create',
      content,
    });
  }

  async rename(
    originalPath: RelativePath,
    newPath: RelativePath,
  ): Promise<void> {
    const state = this._fileStates.get(originalPath);
    const content = this._isCreatedOrUpdated(state)
      ? state.content
      : await this._cachedFileSystem.maybeReadFile(originalPath);

    if (content === null) {
      throw new Error(`Tree: cannot rename missing file "${originalPath}"`);
    }

    /* Keep track that the file was renamed so that we don't reload it from disk.
     * See `RenameChange` type. */
    this._fileStates.set(originalPath, {
      type: 'rename',
    });
    this._fileStates.set(newPath, {
      type: 'update',
      content,
      originalPath,
    });
  }

  delete(path: RelativePath): void {
    this._fileStates.set(path, { type: 'delete' });
  }

  changes(): FileState[] {
    return Array.from(this._fileStates.entries())
      .filter(([_, change]) => change.type !== 'rename')
      .map(([path, change]) => ({
        path,
        ...change,
      }));
  }

  async commit(): Promise<void> {
    for (const [path, change] of this._fileStates.entries()) {
      if (change.type === 'rename') {
        continue;
      }

      if (change.type === 'delete') {
        await this._cachedFileSystem.deleteFile(path);
        continue;
      }

      await this._cachedFileSystem.writeFile(path, change.content);

      if (change.type === 'update' && change.originalPath !== undefined) {
        await this._cachedFileSystem.deleteFile(change.originalPath);
      }
    }

    this._fileStates.clear();
  }

  private _isCreatedOrUpdated(
    state: FileState | undefined,
  ): state is CreateState | UpdateState {
    return state?.type === 'create' || state?.type === 'update';
  }

  private _isDeletedOrRenamed(
    state: FileState | undefined,
  ): state is DeleteState | _RenameState {
    return state?.type === 'delete' || state?.type === 'rename';
  }
}

export type Change = { path: string } & (
  | CreateState
  | UpdateState
  | DeleteState
);

type FileState = CreateState | UpdateState | DeleteState | _RenameState;

interface CreateState {
  type: 'create';
  content: string;
}

interface DeleteState {
  type: 'delete';
}

/**
 * This state is only used to keep track that this file was renamed.
 * It does not move the file on disk. `UpdateChange` does that.
 * We need this just to prevent `Tree` from reloading the file from disk
 * when the file is renamed.
 */
interface _RenameState {
  type: 'rename';
}

interface UpdateState {
  type: 'update';
  content: string;
  originalPath?: RelativePath;
}
