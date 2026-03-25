import { createWorkspaceInfo, WorkspaceInfo } from '../core/workspace-info';
import type { FileSystem } from '../infra/file-system';
import { AngularCliEnricher } from './angular-cli-enricher';
import { Enricher } from './enricher';

/**
 * @deprecated 🚧 work in progress
 */
export class Scanner {
  private _enrichers: Enricher[];
  constructor(private readonly _fileSystem: FileSystem) {
    this._enrichers = [new AngularCliEnricher(this._fileSystem)];
  }

  /**
   * @deprecated 🚧 work in progress
   */
  async scanWorkspace(): Promise<WorkspaceInfo> {
    let workspaceInfo = createWorkspaceInfo();
    for (const enricher of this._enrichers ){
      workspaceInfo = await enricher.enrich(workspaceInfo)
    }
    return workspaceInfo;
  }
}
