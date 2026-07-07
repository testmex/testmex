import { FileSystemCached } from './file-system-cached';
import type { FileSystem } from '../ports/file-system';
import type { RelativePath } from '../models/relative-path';
import type { FileInfo, FileTag } from '../models/workspace-info';

export class Tree {
  private readonly _fileSystemCached: FileSystemCached;
  // TIDYUP: merge `_fileTags` and `_fileStates` into a single map:
  // new Map<RelativePath, { state: FileState , tags: FileTag[]}>
  private readonly _fileStates = new Map<RelativePath, FileState>();
  private readonly _fileTags = new Map<RelativePath, FileTag[]>();

  constructor({ fileSystem }: { fileSystem: FileSystem }) {
    this._fileSystemCached = new FileSystemCached(fileSystem);
  }

  async maybeReadFile(path: RelativePath): Promise<string | null> {
    const state = this._fileStates.get(path);

    if (isDeletedOrGhost(state)) {
      return null;
    }

    if (state?.type === 'create' || state?.type === 'update') {
      return state.content;
    }

    return this._fileSystemCached.maybeReadFile(path);
  }

  async maybeReadJsonFile<T>(path: RelativePath): Promise<T | null> {
    const content = await this.maybeReadFile(path);
    if (content === null) {
      return null;
    }

    return JSON.parse(content) as T;
  }

  async scanDirectory(path?: RelativePath): Promise<RelativePath[]> {
    return this._fileSystemCached.scanDirectory(path);
  }

  async write(path: RelativePath, content: string): Promise<void> {
    const exists = (await this._fileSystemCached.maybeReadFile(path)) !== null;

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
      : await this._fileSystemCached.maybeReadFile(originalPath);

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

    _moveTags(this._fileTags, originalPath, newPath);
  }

  delete(path: RelativePath): void {
    this._fileStates.set(path, { type: 'delete' });
    this._fileTags.delete(path);
  }

  getFiles(): FileInfo[] {
    return [...this._fileTags.entries()]
      .filter(([path]) => !isDeletedOrGhost(this._fileStates.get(path)))
      .map(([path, tags]) => ({ path, tags }));
  }

  tag(path: RelativePath, tag: FileTag): void {
    const tags = this._fileTags.get(path) ?? [];

    if (!tags.includes(tag)) {
      this._fileTags.set(path, [...tags, tag]);
    }
  }

  changes(): Change[] {
    return Array.from(this._fileStates.entries())
      .map(([path, state]) => ({ path, ...state }))
      .filter((state): state is Change => !isGhost(state));
  }

  async commit(): Promise<void> {
    for (const change of this.changes()) {
      if (change.type === 'delete') {
        await this._fileSystemCached.deleteFile(change.path);
        continue;
      }

      await this._fileSystemCached.writeFile(change.path, change.content);

      if (change.type === 'update' && change.originalPath !== undefined) {
        await this._fileSystemCached.deleteFile(change.originalPath);
      }
    }

    this._fileStates.clear();
  }
}

export type ReadonlyTree = Pick<
  Tree,
  'getFiles' | 'maybeReadFile' | 'maybeReadJsonFile' | 'scanDirectory'
>;

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

function _moveTags(
  fileTags: Map<RelativePath, FileTag[]>,
  originalPath: RelativePath,
  newPath: RelativePath,
): void {
  const tags = fileTags.get(originalPath);

  if (tags === undefined) {
    return;
  }

  fileTags.delete(originalPath);

  const existingTags = fileTags.get(newPath) ?? [];
  const mergedTags = [...existingTags];

  for (const tag of tags) {
    if (!mergedTags.includes(tag)) {
      mergedTags.push(tag);
    }
  }

  fileTags.set(newPath, mergedTags);
}
