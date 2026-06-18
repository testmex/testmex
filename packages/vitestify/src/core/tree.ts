import { CachedFileSystem } from '../infra/cached-file-system';
import type { FileSystem } from '../infra/file-system';
import type { RelativePath } from './relative-path';

export class Tree {
  private readonly _cachedFileSystem: CachedFileSystem;
  private readonly _fileStates = new Map<RelativePath, FileState>();

  constructor({ fileSystem }: { fileSystem: FileSystem }) {
    this._cachedFileSystem = new CachedFileSystem(fileSystem);
  }

  asReadonly(): ReadonlyTree {
    return this;
  }

  async maybeReadFile(path: RelativePath): Promise<string | null> {
    const state = this._fileStates.get(path);

    if (isDeletedOrGhost(state)) {
      return null;
    }

    if (state?.type === 'create' || state?.type === 'update') {
      return state.content;
    }

    return this._cachedFileSystem.maybeReadFile(path);
  }

  async scanDirectory(path: RelativePath): Promise<RelativePath[]> {
    return this._cachedFileSystem.scanDirectory(path);
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
    const content = isCreatedOrUpdated(state)
      ? state.content
      : await this._cachedFileSystem.maybeReadFile(originalPath);

    if (content === null) {
      throw new Error(`Tree: cannot rename missing file "${originalPath}"`);
    }

    /* Keep track that the file was renamed so that we don't reload it from disk.
     * See `RenameChange` type. */
    this._fileStates.set(originalPath, {
      type: 'ghost',
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

  changes(): Change[] {
    return Array.from(this._fileStates.entries())
      .map(([path, state]) => ({ path, ...state }))
      .filter((state): state is Change => !isGhost(state));
  }

  async commit(): Promise<void> {
    for (const change of this.changes()) {
      if (change.type === 'delete') {
        await this._cachedFileSystem.deleteFile(change.path);
        continue;
      }

      await this._cachedFileSystem.writeFile(change.path, change.content);

      if (change.type === 'update' && change.originalPath !== undefined) {
        await this._cachedFileSystem.deleteFile(change.originalPath);
      }
    }

    this._fileStates.clear();
  }
}

export type ReadonlyTree = Pick<Tree, 'maybeReadFile' | 'scanDirectory'>;

export type Change = { path: RelativePath } & (
  | CreateState
  | UpdateState
  | DeleteState
);

type FileState = CreateState | UpdateState | DeleteState | GhostState;

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
interface GhostState {
  type: 'ghost';
}

interface UpdateState {
  type: 'update';
  content: string;
  originalPath?: RelativePath;
}

function isCreatedOrUpdated(
  state: FileState | undefined,
): state is CreateState | UpdateState {
  return state?.type === 'create' || state?.type === 'update';
}

function isDeletedOrGhost(
  state: FileState | undefined,
): state is DeleteState | GhostState {
  return state?.type === 'delete' || isGhost(state);
}

function isGhost(state: FileState | undefined): state is GhostState {
  return state?.type === 'ghost';
}
