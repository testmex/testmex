import { CommandRunnerPooled } from '../core/domain/command-runner-pooled';
import { LegacyThrottledProgressReporter } from '../core/domain/legacy-throttled-progress-reporter';
import { throttleProgressSnapshot } from '../core/domain/throttle-progress-snapshot';
import { ProgressTracker } from '../core/models/progress-tracker';
import type { Pack } from '../core/models/pack';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import type { LegacyProgressReporter } from '../core/ports/legacy-progress-reporter';
import { FileSystemImpl } from '../infra/file-system.impl';
import { LegacyTerminalProgressReporter } from '../infra/legacy-terminal-progress-reporter';
import { TerminalProgressReporter } from '../infra/terminal-progress-reporter';
import angularCliPack from '../packs/angular-cli';
import corePack from '../packs/core';
import jestPack from '../packs/jest';
import nxPack from '../packs/nx';
import { Scanner } from '../pipeline/scanner';
import { Analyzer } from './analyzer';
import { Transformer } from './transformer';

export class Vitestify {
  /**
   * Order is important as core pack might install some dependencies first,
   * such as vite-tsconfig-paths which must be installed before @nx/vitest.
   */
  private readonly _packs: Pack[] = [
    corePack,
    jestPack,
    angularCliPack,
    nxPack,
  ];
  private readonly _analyzer: Analyzer;
  private readonly _scanner: Scanner;
  private readonly _transformer: Transformer;
  private readonly _progressTracker: ProgressTracker;

  constructor({
    commandRunner = new CommandRunnerPooled({ maxConcurrent: 10 }),
    fileSystem = new FileSystemImpl({ workspaceRoot: process.cwd() }),
    legacyProgressReporter = new LegacyThrottledProgressReporter(
      new LegacyTerminalProgressReporter(),
    ),
    progressTracker = new ProgressTracker(),
  }: {
    commandRunner?: CommandRunner;
    fileSystem?: FileSystem;
    legacyProgressReporter?: LegacyProgressReporter;
    progressTracker?: ProgressTracker;
  } = {}) {
    this._progressTracker = progressTracker;
    this._analyzer = new Analyzer({
      heuristics: this._packs.flatMap((pack) => pack.heuristics),
      legacyProgressReporter,
    });
    this._scanner = new Scanner({
      commandRunner,
      enrichers: this._packs.flatMap((pack) => pack.enrichers),
      fileSystem,
      legacyProgressReporter,
    });
    this._transformer = new Transformer({
      commandRunner,
      transforms: this._packs.flatMap((pack) => pack.transforms),
      legacyProgressReporter,
    });
  }

  async run(): Promise<void> {
    const progressReporter = new TerminalProgressReporter();
    const progressSubscription = this._progressTracker.snapshot$
      .pipe(throttleProgressSnapshot(100))
      .subscribe((snapshot) => progressReporter.notify(snapshot));

    try {
      const workspace = await this._scanner.scanWorkspace();
      await this._analyzer.analyze(workspace);
      await this._transformer.transform(workspace);
    } finally {
      progressSubscription.unsubscribe();
    }
  }
}
