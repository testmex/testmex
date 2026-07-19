import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import type { Enricher } from '../core/models/enricher';
import type { ProgressTracker } from '../core/models/progress-tracker';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import { LEGACY_NO_OP_STEP } from '../core/ports/legacy-progress-reporter';
import type { LegacyProgressReporter } from '../core/ports/legacy-progress-reporter';

export class Scanner {
  private readonly _commandRunner: CommandRunner;
  private readonly _enrichers: Enricher[];
  private readonly _fileSystem: FileSystem;
  private readonly _legacyProgressReporter: LegacyProgressReporter;

  constructor(args: {
    commandRunner: CommandRunner;
    enrichers: Enricher[];
    fileSystem: FileSystem;
    legacyProgressReporter: LegacyProgressReporter;
    progressTracker?: ProgressTracker;
  }) {
    if (args.progressTracker !== undefined) {
      throw new Error('🚧 work in progress');
    }

    this._commandRunner = args.commandRunner;
    this._enrichers = args.enrichers;
    this._fileSystem = args.fileSystem;
    this._legacyProgressReporter = args.legacyProgressReporter;
  }

  async scanWorkspace(): Promise<Workspace> {
    const tree = new Tree({ fileSystem: this._fileSystem });
    const workspace = new Workspace({ tree });

    const stepCount = this._enrichers.length;
    const phase = this._legacyProgressReporter.createPhase('Scanning');

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
        progressStep: {
          ...LEGACY_NO_OP_STEP,
          updateMessage: (detail) => {
            lastMessage = detail;
            progressStep.updateMessage(_formatStepMessage('scanning', detail));
          },
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
