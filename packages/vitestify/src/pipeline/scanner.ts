import debug from 'debug';
import { EnricherFactory } from '../core/models/enricher';
import { Tree } from '../core/domain/tree';
import { defineWorkspace, type Workspace } from '../core/domain/workspace';
import { createWorkspaceInfo } from '../core/models/workspace-info';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';

const log = debug('vitestify:scanner');

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
    log('scanning workspace');
    const tree = new Tree({ fileSystem: this._fileSystem });
    const enrichers = this._enricherFactories.map((factory) =>
      factory({ commandRunner: this._commandRunner, tree }),
    );

    let workspaceInfo = createWorkspaceInfo();
    let count = 0;
    for (const enricher of enrichers) {
      workspaceInfo = await enricher.enrich(workspaceInfo);
      count += workspaceInfo.projects.flatMap(
        (project) => project.files,
      ).length;
      if (count > 0) {
        log(`found ${count} files`);
      }
    }

    if (count === 0) {
      log('no files found');
    }

    return defineWorkspace({ info: workspaceInfo, tree });
  }
}
