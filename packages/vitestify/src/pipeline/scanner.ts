import { Tree } from '../core/domain/tree';
import { Workspace } from '../core/domain/workspace';
import type { Enricher } from '../core/models/enricher';
import type { EnricherStep } from '../core/models/progress-tracker/enricher-step';
import type { ProgressTracker } from '../core/models/progress-tracker';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import { LEGACY_NO_OP_STEP } from '../core/ports/legacy-progress-reporter';
import type {
  LegacyProgressReporter,
  LegacyStep,
} from '../core/ports/legacy-progress-reporter';

export class Scanner {
  private readonly _commandRunner: CommandRunner;
  private readonly _enrichers: Enricher[];
  private readonly _fileSystem: FileSystem;
  private readonly _legacyProgressReporter: LegacyProgressReporter;
  private readonly _progressTracker?: ProgressTracker;

  constructor(args: {
    commandRunner: CommandRunner;
    enrichers: Enricher[];
    fileSystem: FileSystem;
    legacyProgressReporter: LegacyProgressReporter;
    progressTracker?: ProgressTracker;
  }) {
    this._commandRunner = args.commandRunner;
    this._enrichers = args.enrichers;
    this._fileSystem = args.fileSystem;
    this._legacyProgressReporter = args.legacyProgressReporter;
    this._progressTracker = args.progressTracker;
  }

  async scanWorkspace(): Promise<Workspace> {
    if (this._progressTracker !== undefined) {
      return this._scanWorkspaceWithProgressTracker(this._progressTracker);
    }

    return this._scanWorkspaceWithLegacyProgressReporter();
  }

  private async _scanWorkspaceWithProgressTracker(
    progressTracker: ProgressTracker,
  ): Promise<Workspace> {
    const tree = new Tree({ fileSystem: this._fileSystem });
    const workspace = new Workspace({ tree });
    const phase = progressTracker.beginScanning({
      enricherCount: this._enrichers.length,
    });

    for (const enricher of this._enrichers) {
      const enricherStep = phase.createEnricherStep({ name: enricher.name });
      const result = await enricher.enrich({
        workspace: workspace.asReadonly(),
        commandRunner: this._commandRunner,
        progressStep: _createEnricherProgressStepAdapter(enricherStep),
      });

      workspace.applyEnrichment(result);
      enricherStep.done();
    }

    phase.done();

    return workspace;
  }

  private async _scanWorkspaceWithLegacyProgressReporter(): Promise<Workspace> {
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

function _createEnricherProgressStepAdapter(enricherStep: EnricherStep): LegacyStep {
  return {
    ...LEGACY_NO_OP_STEP,
    updateMessage: (message) => {
      const detectedFileCount = _parseDetectedFileCount(message);
      if (detectedFileCount !== undefined) {
        enricherStep.setDetectedFileCount(detectedFileCount);
      }
    },
    done: (message) => enricherStep.done(message),
    error: (message) => enricherStep.fail(message),
  };
}

function _parseDetectedFileCount(message: string): number | undefined {
  const match = message.match(/^(\d+) file\(s\) found$/);
  return match === null ? undefined : Number(match[1]);
}

const _formatStepMessage = (phase: string, detail?: string) =>
  detail === undefined ? phase : `${phase} · ${detail}`;
