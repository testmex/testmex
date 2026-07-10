import debug from 'debug';
import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { EnricherFactory, type Enricher } from '../core/models/enricher';
import type { ReadonlyWorkspace } from '../core/domain/workspace';
import type { WorkspaceEnrichment } from '../core/models/workspace-info';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import type { ProgressReporter } from '../core/ports/progress-reporter';

const log = debug('vitestify:scanner');

export class Scanner {
  private readonly _commandRunner: CommandRunner;
  private readonly _enricherFactories: EnricherFactory[];
  private readonly _fileSystem: FileSystem;
  private readonly _progressReporter: ProgressReporter;

  constructor(args: {
    commandRunner: CommandRunner;
    enricherFactories: EnricherFactory[];
    fileSystem: FileSystem;
    progressReporter: ProgressReporter;
  }) {
    this._commandRunner = args.commandRunner;
    this._enricherFactories = args.enricherFactories;
    this._fileSystem = args.fileSystem;
    this._progressReporter = args.progressReporter;
  }

  /**
   * @deprecated 🚧 work in progress
   */
  private async _enrichWithProgress(
    _enricher: Enricher,
    _workspace: ReadonlyWorkspace,
  ): Promise<WorkspaceEnrichment> {
    throw new Error('🚧 work in progress');
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
      const result = await enricher.enrich({
        workspace: workspace.asReadonly(),
      });

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
