import type { ReadonlyTree } from '../../core/domain/tree';
import { Enricher } from '../../core/models/enricher';
import type { RelativePath } from '../../core/models/relative-path';
import {
  type FileInfo,
  type WorkspaceInfo,
} from '../../core/models/workspace-info';
import { fileTags } from './identifiers';
import { isCodeFile } from './util';

export class CodeEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const files = await this._tree.scanDirectory();
    const discoveredFiles = this._discoverCodeFiles(files);

    return workspaceInfo.merge({ files: discoveredFiles });
  }

  // TIDYUP: inline this method
  private _discoverCodeFiles(files: RelativePath[]): FileInfo[] {
    return files
      .filter(isCodeFile)
      .map((path) => ({
        path,
        tags: [fileTags.code],
      }));
  }
}
