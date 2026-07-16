import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import type { Enricher } from '../core/models/enricher';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import type { ProgressReporter } from '../core/ports/progress-reporter';

export class Scanner {
  private readonly _commandRunner: CommandRunner;
  private readonly _enrichers: Enricher[];
  private readonly _fileSystem: FileSystem;
  private readonly _progressReporter: ProgressReporter;

  constructor(args: {
    commandRunner: CommandRunner;
    enrichers: Enricher[];
    fileSystem: FileSystem;
    progressReporter: ProgressReporter;
  }) {
    this._commandRunner = args.commandRunner;
    this._enrichers = args.enrichers;
    this._fileSystem = args.fileSystem;
    this._progressReporter = args.progressReporter;
  }

  async scanWorkspace(): Promise<Workspace> {
    const tree = new Tree({ fileSystem: this._fileSystem });
    const workspace = new Workspace({ tree });

    const stepCount = this._enrichers.length;
    const phase = this._progressReporter.createPhase('Scanning');

    for (const [index, enricher] of this._enrichers.entries()) {
      const progressStep = phase.createStep({
        name: enricher.name,
        stepNumber: index + 1,
        stepCount,
      });
      let lastMessage: string | undefined;

      progressStep.updateMessage('scanning');

      const result = await enricher.enrich({
        workspace: workspace.asReadonly(),
        commandRunner: this._commandRunner,
        onProgress: (message) => {
          lastMessage = message;
          progressStep.updateMessage(_formatStepMessage('scanning', message));
        },
      });

      workspace.applyEnrichment(result);

      progressStep.done(_formatStepMessage('scanned', lastMessage));
    }

    phase.done();

    return workspace;
  }
}

const _formatStepMessage = (phase: string, detail?: string) =>
  detail === undefined ? phase : `${phase} · ${detail}`;
