import { CommandRunner } from 'src/infra/command-runner';
import { Tree } from '../core/tree';
import { createWorkspace, type Workspace } from '../core/workspace';
import { createWorkspaceInfo } from '../core/workspace-info';
import type { FileSystem } from '../infra/file-system';
import { AngularCliEnricher } from '../packs/angular-cli/angular-cli-enricher';
import { TestEnricher } from '../packs/core/test-enricher';
import { JestEnricher } from '../packs/jest/jest-enricher';
import { NxEnricher } from '../packs/nx/nx-enricher';
import { Enricher } from '../core/enricher';


export class Scanner {
  private readonly _fileSystem: FileSystem;
  private _enrichers: Enricher[];
  constructor(args: { commandRunner: CommandRunner; fileSystem: FileSystem }) {
    this._fileSystem = args.fileSystem;
    this._enrichers = [
      new AngularCliEnricher(args),
      new NxEnricher(args),
      new JestEnricher(args),
      new TestEnricher(args),
    ];
  }

  async scanWorkspace(): Promise<Workspace> {
    const tree = new Tree({ fileSystem: this._fileSystem });

    let workspaceInfo = createWorkspaceInfo();
    for (const enricher of this._enrichers) {
      workspaceInfo = await enricher.enrich(workspaceInfo);
    }

    return createWorkspace(workspaceInfo, tree);
  }
}
