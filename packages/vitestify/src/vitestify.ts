import { Analyzer } from './analyzer';
import type { Pack } from './core/models/pack';
import type { CommandRunner } from './core/ports/command-runner';
import type { FileSystem } from './core/ports/file-system';
import { FileSystemImpl } from './infra/file-system.impl';
import { CommandRunnerPooled } from './infra/command-runner-pooled';
import angularCliPack from './packs/angular-cli';
import corePack from './packs/core';
import jestPack from './packs/jest';
import nxPack from './packs/nx';
import { Scanner } from './scanner/scanner';
import { Transformer } from './transformer';

export class Vitestify {
  private readonly _packs: Pack[] = [
    angularCliPack,
    nxPack,
    jestPack,
    corePack,
  ];
  private readonly _analyzer: Analyzer;
  private readonly _scanner: Scanner;
  private readonly _transformer: Transformer;

  constructor({
    commandRunner = new CommandRunnerPooled({ maxConcurrent: 10 }),
    fileSystem = new FileSystemImpl({ workspaceRoot: process.cwd() }),
  }: { commandRunner?: CommandRunner; fileSystem?: FileSystem } = {}) {
    this._scanner = new Scanner({
      commandRunner,
      enricherFactories: this._packs.flatMap((pack) => pack.enricherFactories),
      fileSystem,
    });
    this._analyzer = new Analyzer({
      heuristics: this._packs.flatMap((pack) => pack.heuristics),
    });
    this._transformer = new Transformer({
      transforms: this._packs.flatMap((pack) => pack.transforms),
    });
  }

  async run(): Promise<void> {
    const workspace = await this._scanner.scanWorkspace();
    const findings = await this._analyzer.analyze(workspace);
    await this._transformer.transform({ findings, workspace });
  }
}
