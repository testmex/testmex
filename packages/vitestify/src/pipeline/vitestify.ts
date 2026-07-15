import { CommandRunnerPooled } from '../core/domain/command-runner-pooled';
import { ThrottledProgressReporter } from '../core/domain/throttled-progress-reporter';
import type { Pack } from '../core/models/pack';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import type { ProgressReporter } from '../core/ports/progress-reporter';
import { TerminalProgressReporter } from '../infra/terminal-progress-reporter';
import { FileSystemImpl } from '../infra/file-system.impl';
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
    jestPack,
    corePack,
    angularCliPack,
    nxPack,
  ];
  private readonly _analyzer: Analyzer;
  private readonly _scanner: Scanner;
  private readonly _transformer: Transformer;

  constructor({
    commandRunner = new CommandRunnerPooled({ maxConcurrent: 10 }),
    fileSystem = new FileSystemImpl({ workspaceRoot: process.cwd() }),
    progressReporter = new ThrottledProgressReporter(
      new TerminalProgressReporter(),
    ),
  }: {
    commandRunner?: CommandRunner;
    fileSystem?: FileSystem;
    progressReporter?: ProgressReporter;
  } = {}) {
    this._analyzer = new Analyzer({
      heuristics: this._packs.flatMap((pack) => pack.heuristics),
      progressReporter,
    });
    this._scanner = new Scanner({
      commandRunner,
      enricherFactories: this._packs.flatMap((pack) => pack.enricherFactories),
      fileSystem,
      progressReporter,
    });
    this._transformer = new Transformer({
      commandRunner,
      transforms: this._packs.flatMap((pack) => pack.transforms),
      progressReporter,
    });
  }

  async run(): Promise<void> {
    const workspace = await this._scanner.scanWorkspace();
    await this._analyzer.analyze(workspace);
    await this._transformer.transform(workspace);
  }
}
