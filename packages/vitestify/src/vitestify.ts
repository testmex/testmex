import debug from 'debug';
import type { Finding } from './core/models/finding';
import type { Pack } from './core/models/pack';
import type { CommandRunner } from './core/ports/command-runner';
import type { FileSystem } from './core/ports/file-system';
import { FileSystemImpl } from './infra/file-system.impl';
import { PooledCommandRunner } from './infra/pooled-command-runner';
import angularCliPack from './packs/angular-cli';
import corePack from './packs/core';
import jestPack from './packs/jest';
import nxPack from './packs/nx';
import { Scanner } from './scanner/scanner';

const log = debug('vitestify:main');

export class Vitestify {
  private readonly _packs: Pack[] = [
    angularCliPack,
    nxPack,
    jestPack,
    corePack,
  ];
  private readonly _scanner: Scanner;

  constructor({
    commandRunner = new PooledCommandRunner({ maxConcurrent: 10 }),
    fileSystem = new FileSystemImpl({ workspaceRoot: process.cwd() }),
  }: { commandRunner?: CommandRunner; fileSystem?: FileSystem } = {}) {
    this._scanner = new Scanner({
      commandRunner,
      enricherFactories: this._packs.flatMap((pack) => pack.enricherFactories),
      fileSystem,
    });
  }

  async run(): Promise<void> {
    log('scanning workspace');
    const workspace = await this._scanner.scanWorkspace();

    const heuristics = this._packs.flatMap((pack) =>
      pack.heuristics.map((heuristic) => ({ packName: pack.name, heuristic })),
    );
    log('running %d heuristics', heuristics.length);
    const findings: Finding[] = [];
    for (const [index, { packName, heuristic }] of heuristics.entries()) {
      log('heuristic %d/%d (%s)', index + 1, heuristics.length, packName);
      findings.push(...(await heuristic.inspect(workspace)));
    }
    log('found %d findings', findings.length);

    const transforms = this._packs.flatMap((pack) =>
      pack.transforms.map((transform) => ({ packName: pack.name, transform })),
    );
    log('running %d transforms', transforms.length);
    for (const [index, { packName, transform }] of transforms.entries()) {
      log('transform %d/%d (%s)', index + 1, transforms.length, packName);
      await transform.apply({ findings, workspace });
    }

    log('committing workspace tree');
    await workspace.tree.commit();
    log('done');
  }
}
