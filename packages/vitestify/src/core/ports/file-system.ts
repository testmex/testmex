import type { RelativePath } from '../models/relative-path';

export interface FileSystem {
  maybeReadFile(path: RelativePath): Promise<string | null>;
  scanDirectory(path: RelativePath): Promise<RelativePath[]>;
  writeFile(path: RelativePath, content: string): Promise<void>;
  deleteFile(path: RelativePath): Promise<void>;
}
