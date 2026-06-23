import { Analyzer } from './analyzer';
import { CommandRunnerPooled } from '../core/domain/command-runner-pooled';
import type { Pack } from '../core/models/pack';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';
import { FileSystemImpl } from '../infra/file-system.impl';
import angularCliPack from '../packs/angular-cli';
import corePack from '../packs/core';
import jestPack from '../packs/jest';
import nxPack from '../packs/nx';
import { Scanner } from '../pipeline/scanner';
import { Finalizer } from './finalizer';
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
  private readonly _finalizer: Finalizer;
  private readonly _scanner: Scanner;
  private readonly _transformer: Transformer;

  constructor({
    commandRunner = new CommandRunnerPooled({ maxConcurrent: 10 }),
    fileSystem = new FileSystemImpl({ workspaceRoot: process.cwd() }),
  }: { commandRunner?: CommandRunner; fileSystem?: FileSystem } = {}) {
    this._analyzer = new Analyzer({
      heuristics: this._packs.flatMap((pack) => pack.heuristics),
    });
    this._finalizer = new Finalizer({ commandRunner });
    this._scanner = new Scanner({
      commandRunner,
      enricherFactories: this._packs.flatMap((pack) => pack.enricherFactories),
      fileSystem,
    });
    this._transformer = new Transformer({
      transforms: this._packs.flatMap((pack) => pack.transforms),
    });
  }

  async run(): Promise<void> {
    const workspace = await this._scanner.scanWorkspace();
    const findings = await this._analyzer.analyze(workspace);
    await this._transformer.transform({ findings, workspace });
    await this._finalizer.finalize(workspace);
  }
}
