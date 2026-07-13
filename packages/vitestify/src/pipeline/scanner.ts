import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import { EnricherFactory } from '../core/models/enricher';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import type { ProgressReporter } from '../core/ports/progress-reporter';

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

  async scanWorkspace(): Promise<Workspace> {
    const tree = new Tree({ fileSystem: this._fileSystem });
    const enrichers = this._enricherFactories.map((factory) =>
      factory({ commandRunner: this._commandRunner }),
    );

    const workspace = new Workspace({ tree });

    const stepCount = enrichers.length;

    for (const [index, enricher] of enrichers.entries()) {
      const progressStep = this._progressReporter.createStep({
        name: enricher.name,
        stepNumber: index + 1,
        stepCount,
      });
      let lastMessage: string | undefined;

      progressStep.message('scanning');

      const result = await enricher.enrich({
        workspace: workspace.asReadonly(),
        onProgress: (message) => {
          lastMessage = message;
          progressStep.message(_formatStepMessage('scanning', message));
        },
      });

      workspace.applyEnrichment(result);

      progressStep.done(_formatStepMessage('scanned', lastMessage));
    }

    return workspace;
  }
}

const _formatStepMessage = (phase: string, detail?: string) =>
  detail === undefined ? phase : `${phase} · ${detail}`;
