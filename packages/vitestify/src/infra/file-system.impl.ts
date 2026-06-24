import type { Dirent } from 'node:fs';
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile as writeFileFs,
} from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { posix } from 'node:path/posix';
import type { RelativePath } from '../core/models/relative-path';
import { relativePath } from '../core/models/relative-path';
import type { FileSystem } from '../core/ports/file-system';

export class FileSystemImpl implements FileSystem {
  private readonly _workspaceRoot: string;

  constructor(args: { workspaceRoot: string }) {
    this._workspaceRoot = args.workspaceRoot;
  }

  /**
   * Returns file content or null if the file is not found.
   */
  async maybeReadFile(path: RelativePath): Promise<string | null> {
    const absolutePath = join(this._workspaceRoot, this._fromPosixPath(path));

    try {
      return await readFile(absolutePath, 'utf8');
    } catch (error) {
      if (this._isEnoent(error)) {
        return null;
      }

      throw error;
    }
  }

  async scanDirectory(path?: RelativePath): Promise<RelativePath[]> {
    const directory = path
      ? join(this._workspaceRoot, path)
      : this._workspaceRoot;
    const files = await this._collectFiles(directory);

    if (!path) {
      return files;
    }

    const prefix = `${path}/`;
    return files.filter((file) => file.startsWith(prefix));
  }

  async writeFile(path: RelativePath, content: string): Promise<void> {
    const absolutePath = join(this._workspaceRoot, path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFileFs(absolutePath, content, 'utf8');
  }

  async deleteFile(path: RelativePath): Promise<void> {
    const absolutePath = join(this._workspaceRoot, path);

    try {
      await rm(absolutePath, { force: true });
    } catch (error) {
      if (this._isEnoent(error)) {
        return;
      }

      throw error;
    }
  }

  private async _collectFiles(directory: string): Promise<RelativePath[]> {
    let entries: Dirent[];

    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (this._isEnoent(error)) {
        return [];
      }

      throw error;
    }

    const files: RelativePath[] = [];

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await this._collectFiles(absolutePath)));
        continue;
      }

      if (entry.isFile()) {
        files.push(
          this._toPosixPath(
            relativePath(relative(this._workspaceRoot, absolutePath)),
          ),
        );
      }
    }

    return files;
  }

  private _isEnoent(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }

  private _toPosixPath(path: RelativePath): RelativePath {
    return relativePath(path.split(sep).join(posix.sep));
  }

  private _fromPosixPath(path: RelativePath): RelativePath {
    return relativePath(path.split(posix.sep).join(sep));
  }
}
