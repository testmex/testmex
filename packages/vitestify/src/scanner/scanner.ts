import { EnricherFactory } from '../core/enricher';
import { Tree } from '../core/tree';
import { defineWorkspace, type Workspace } from '../core/workspace';
import { createWorkspaceInfo } from '../core/workspace-info';
import type { CommandRunner } from '../infra/command-runner';
import type { FileSystem } from '../infra/file-system';

export class Scanner {
  private readonly _commandRunner: CommandRunner;
  private readonly _enricherFactories: EnricherFactory[];
  private readonly _fileSystem: FileSystem;

  constructor(args: {
    commandRunner: CommandRunner;
    enricherFactories: EnricherFactory[];
    fileSystem: FileSystem;
  }) {
    this._commandRunner = args.commandRunner;
    this._enricherFactories = args.enricherFactories;
    this._fileSystem = args.fileSystem;
  }

  async scanWorkspace(): Promise<Workspace> {
    const tree = new Tree({ fileSystem: this._fileSystem });
    const enrichers = this._enricherFactories.map((factory) =>
      factory({ commandRunner: this._commandRunner, tree }),
    );

    let workspaceInfo = createWorkspaceInfo();
    for (const enricher of enrichers) {
      workspaceInfo = await enricher.enrich(workspaceInfo);
    }

    return defineWorkspace({ info: workspaceInfo, tree });
  }
}
