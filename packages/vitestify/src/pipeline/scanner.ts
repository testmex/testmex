import debug from 'debug';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { EnricherFactory } from '../core/models/enricher';
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
      factory({ commandRunner: this._commandRunner }),
    );

    let count = 0;
    const workspace = new Workspace({ tree });
    for (const enricher of enrichers) {
      const result = await enricher.enrich(workspace.asReadonly());

      workspace.applyEnrichment(result);

      count = workspace.getFiles().length;
      if (count > 0) {
        log(`found ${count} files`);
      }
    }

    if (count === 0) {
      log('no files found');
    }

    return workspace;
  }
}
