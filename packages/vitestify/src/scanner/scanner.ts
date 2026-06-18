import { CommandRunner } from 'src/infra/command-runner';
import { createWorkspaceInfo, WorkspaceInfo } from '../core/workspace-info';
import type { FileSystem } from '../infra/file-system';
import { AngularCliEnricher } from '../packs/angular-cli/angular-cli-enricher';
import { TestEnricher } from '../packs/core/test-enricher';
import { JestEnricher } from '../packs/jest/jest-enricher';
import { NxEnricher } from '../packs/nx/nx-enricher';
import { Enricher } from '../core/enricher';

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
      new TestEnricher(args),
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
