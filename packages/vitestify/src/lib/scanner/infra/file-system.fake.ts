import type { RelativePath } from '../core.js';

export class FileSystemFake {
  private readonly _files = new Map<RelativePath, string>();

  configure(entries: Record<RelativePath, string>): void {
    this._files.clear();
    for (const [path, content] of Object.entries(entries)) {
      this._files.set(path as RelativePath, content);
    }
  }

  async scanDirectory(path: RelativePath): Promise<RelativePath[]> {
    const files = Array.from(this._files.keys());

    return files.filter((file) => this._isParentDirectory(path, file));
  }

  private _isParentDirectory(
    parent: RelativePath,
    child: RelativePath,
  ): boolean {
    const parentBlocks = parent.split('/');
    const childBlocks = child.split('/');

    if (parentBlocks.length !== childBlocks.length) {
      return false;
    }

    for (let i = 0; i < parentBlocks.length; i++) {
      if (parentBlocks[i] !== childBlocks[i]) {
        return false;
      }
    }

    return true;
  }
}
