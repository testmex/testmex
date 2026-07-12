import {
  mkdir,
  readFile,
  rm,
  writeFile as writeFileFs,
} from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { posix } from 'node:path/posix';
import { globbyStream } from 'globby';
import type { RelativePath } from '../core/models/relative-path';
import { relativePath } from '../core/models/relative-path';
import type {
  FileSystem,
  ScanDirectoryOptions,
} from '../core/ports/file-system';

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

  async *scanDirectory(
    options?: ScanDirectoryOptions,
  ): AsyncIterable<RelativePath> {
    const root = options?.root;
    const pattern = options?.pattern ?? '**/*';
    const cwd = root
      ? join(this._workspaceRoot, this._fromPosixPath(root))
      : this._workspaceRoot;

    for await (const file of globbyStream(pattern, {
      cwd,
      gitignore: true,
      onlyFiles: true,
    })) {
      const relativeFile = this._toPosixPath(file);

      yield relativePath(root ? `${root}/${relativeFile}` : relativeFile);
    }
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

  private _isEnoent(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }

  private _toPosixPath(path: string): RelativePath {
    return relativePath(path.split(sep).join(posix.sep));
  }

  private _fromPosixPath(path: RelativePath): string {
    return relativePath(path.split(posix.sep).join(sep));
  }
}
