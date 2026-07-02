import type { ReadonlyTree } from '../../core/domain/tree';
import { Enricher } from '../../core/models/enricher';
import type { WorkspaceInfo } from '../../core/models/workspace-info';
import { fileTags } from './identifiers';
import { isCodeFile } from './utils';

export class CodeEnricher implements Enricher {
  private readonly _tree: ReadonlyTree;

  constructor({ tree }: { tree: ReadonlyTree }) {
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    const files = await this._tree.scanDirectory();
    const discoveredFiles = files.filter(isCodeFile).map((path) => ({
      path,
      tags: [fileTags.code],
    }));

    return workspaceInfo.merge({ files: discoveredFiles });
  }
}
