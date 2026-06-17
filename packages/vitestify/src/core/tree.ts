import type { Change } from './change';
import type { RelativePath } from './relative-path';
import type { FileSystem } from '../infra/file-system';

/**
 * @deprecated 🚧 work in progress
 */
export class Tree {
  constructor(args: { fileSystem: FileSystem }) {}

  /**
   * @deprecated 🚧 work in progress
   */
  async exists(path: RelativePath): Promise<boolean> {
    throw new Error('🚧 work in progress');
  }

  /**
   * @deprecated 🚧 work in progress
   */
  async read(path: RelativePath): Promise<string> {
    throw new Error('🚧 work in progress');
  }

  /**
   * @deprecated 🚧 work in progress
   */
  write(
    path: RelativePath,
    content: string,
    options?: { originalPath?: RelativePath },
  ): void {
    throw new Error('🚧 work in progress');
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
