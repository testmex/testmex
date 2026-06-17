import { CommandRunner } from 'src/infra/command-runner';
import { createWorkspaceInfo, WorkspaceInfo } from '../core/workspace-info';
import type { FileSystem } from '../infra/file-system';
import { AngularCliEnricher } from './angular-cli-enricher';
import { Enricher } from './enricher';
import { JestEnricher } from './jest-enricher';
import { NxEnricher } from './nx-enricher';

/**
 * @deprecated 🚧 work in progress
 */
export class Scanner {
  private _enrichers: Enricher[];
  constructor(args: { commandRunner: CommandRunner; fileSystem: FileSystem }) {
    this._enrichers = [
      new AngularCliEnricher(args),
      new NxEnricher(args),
      new JestEnricher(args),
    ];
  }

  /**
   * @deprecated 🚧 work in progress
   */
  async scanWorkspace(): Promise<WorkspaceInfo> {
    let workspaceInfo = createWorkspaceInfo();
    for (const enricher of this._enrichers) {
      workspaceInfo = await enricher.enrich(workspaceInfo);
    }
    return workspaceInfo;
  }
}
