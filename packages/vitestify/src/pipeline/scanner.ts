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

    const total = enrichers.length;

    for (const [index, enricher] of enrichers.entries()) {
      const step = index + 1;
      const spinner = this._progressReporter.createSpinner();
      let lastMessage: string | undefined;

      const formatEnricherMessage = (
        phase: 'scanning' | 'scanned',
        message?: string,
      ) => {
        const prefix = phase === 'scanning' ? 'Scanning' : 'Scanned ';
        const line = `${prefix} [${step}/${total}] ${enricher.name}`;
        return message === undefined ? line : `${line} · ${message}`;
      };

      spinner.message(formatEnricherMessage('scanning'));

      const result = await enricher.enrich({
        workspace: workspace.asReadonly(),
        onProgress: (message) => {
          lastMessage = message;
          spinner.message(formatEnricherMessage('scanning', message));
        },
      });

      spinner.done(formatEnricherMessage('scanned', lastMessage));

      workspace.applyEnrichment(result);
    }

    return workspace;
  }
}
