import { FileSystem } from './infra/file-system';
import type { Finding } from './core/finding';
import type { Pack } from './core/pack';
import { CommandRunner } from './infra/command-runner';
import angularCliPack from './packs/angular-cli';
import corePack from './packs/core';
import jestPack from './packs/jest';
import nxPack from './packs/nx';
import { Scanner } from './scanner/scanner';

export class Vitestify {
  private readonly _packs: Pack[] = [
    angularCliPack,
    nxPack,
    jestPack,
    corePack,
  ];
  private readonly _scanner: Scanner;

  constructor({ workspaceRoot }: { workspaceRoot: string }) {
    const commandRunner = new CommandRunner();
    const fileSystem = new FileSystem({ workspaceRoot });

    this._scanner = new Scanner({
      commandRunner,
      enricherFactories: this._packs.flatMap((pack) => pack.enricherFactories),
      fileSystem,
    });
  }

  async run(): Promise<void> {
    const workspace = await this._scanner.scanWorkspace();

    const findings: Finding[] = [];
    for (const heuristic of this._packs.flatMap((pack) => pack.heuristics)) {
      findings.push(...(await heuristic.inspect(workspace)));
    }

    for (const transform of this._packs.flatMap((pack) => pack.transforms)) {
      await transform.apply({ findings, workspace });
    }

    await workspace.tree.commit();
  }
}
