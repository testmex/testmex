import type { ReadonlyTree } from '../../core/domain/tree';
import { Enricher } from '../../core/models/enricher';
import type { RelativePath } from '../../core/models/relative-path';
import {
  type FileInfo,
  type WorkspaceInfo,
} from '../../core/models/workspace-info';
import { fileTags } from './identifiers';
import { isTestFile } from './utils';

export class TestEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const files = await this._tree.scanDirectory();
    const discoveredFiles = [
      ...this._discoverSnapshotFiles(files),
      ...this._discoverTestFiles(files),
    ];

    return workspaceInfo.merge({ files: discoveredFiles });
  }

  private _discoverSnapshotFiles(files: RelativePath[]): FileInfo[] {
    return files
      .filter((file) => file.endsWith('.snap'))
      .map((path) => ({
        path,
        tags: [fileTags.snapshot],
      }));
  }

  private _discoverTestFiles(files: RelativePath[]): FileInfo[] {
    return files.filter(isTestFile).map((path) => ({
      path,
      tags: [fileTags.test],
    }));
  }
}
