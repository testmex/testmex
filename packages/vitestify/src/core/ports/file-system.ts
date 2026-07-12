import type { RelativePath } from '../models/relative-path';

export interface ScanDirectoryOptions {
  root?: RelativePath;
  pattern?: string;
}

export interface FileSystem {
  maybeReadFile(path: RelativePath): Promise<string | null>;
  scanDirectory(options?: ScanDirectoryOptions): AsyncIterable<RelativePath>;
  writeFile(path: RelativePath, content: string): Promise<void>;
  deleteFile(path: RelativePath): Promise<void>;
}
