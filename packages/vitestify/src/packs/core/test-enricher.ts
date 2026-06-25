import type { ReadonlyTree } from '../../core/domain/tree';
import { Enricher } from '../../core/models/enricher';
import {
  type FileInfo,
  type WorkspaceInfo,
} from '../../core/models/workspace-info';
import { fileTags } from './identifiers';

export class TestEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const discoveredFiles = [
      ...(await this._discoverSnapshotFiles()),
      ...(await this._discoverTestFiles()),
    ];

    return workspaceInfo.merge({ files: discoveredFiles });
  }

  private async _discoverSnapshotFiles(): Promise<FileInfo[]> {
    return (await this._tree.scanDirectory())
      .filter((file) => file.endsWith('.snap'))
      .map((path) => ({
        path,
        tags: [fileTags.snapshot],
      }));
  }

  private async _discoverTestFiles(): Promise<FileInfo[]> {
    return (await this._tree.scanDirectory())
      .filter((file) => file.endsWith('.spec.ts') || file.endsWith('.spec.tsx'))
      .map((path) => ({
        path,
        tags: [fileTags.test],
      }));
  }
}
