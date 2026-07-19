import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import type { Enricher } from '../core/models/enricher';
import type { ProgressTracker } from '../core/models/progress-tracker';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';

export class Scanner {
  private readonly _commandRunner: CommandRunner;
  private readonly _enrichers: Enricher[];
  private readonly _fileSystem: FileSystem;
  private readonly _progressTracker: ProgressTracker;

  constructor(args: {
    commandRunner: CommandRunner;
    enrichers: Enricher[];
    fileSystem: FileSystem;
    progressTracker: ProgressTracker;
  }) {
    this._commandRunner = args.commandRunner;
    this._enrichers = args.enrichers;
    this._fileSystem = args.fileSystem;
    this._progressTracker = args.progressTracker;
  }

  async scanWorkspace(): Promise<Workspace> {
    const tree = new Tree({ fileSystem: this._fileSystem });
    const workspace = new Workspace({ tree });
    const phase = this._progressTracker.beginScanning({
      enricherCount: this._enrichers.length,
    });

    for (const enricher of this._enrichers) {
      const enricherStep = phase.createEnricherStep({ name: enricher.name });
      const result = await enricher.enrich({
        workspace: workspace.asReadonly(),
        commandRunner: this._commandRunner,
        enricherStep,
      });

      workspace.applyEnrichment(result);
      enricherStep.done();
    }

    phase.done();

    return workspace;
  }
}
