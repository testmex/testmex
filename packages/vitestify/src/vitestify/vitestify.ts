import type { Finding } from '../core/finding';
import type { CommandRunner } from '../infra/command-runner';
import type { FileSystem } from '../infra/file-system';
import { heuristics } from '../packs/jest/index';
import { Scanner } from '../scanner/scanner';
import { transforms } from '../transforms/index';

export class Vitestify {
  private readonly _scanner: Scanner;

  constructor(args: { commandRunner: CommandRunner; fileSystem: FileSystem }) {
    const { commandRunner, fileSystem } = args;
    this._scanner = new Scanner({ commandRunner, fileSystem });
  }

  async run(): Promise<void> {
    const workspace = await this._scanner.scanWorkspace();

    const findings: Finding[] = [];
    for (const heuristic of heuristics) {
      findings.push(...(await heuristic.inspect(workspace)));
    }

    for (const transform of transforms) {
      await transform.apply({ findings, workspace });
    }

    await workspace.tree.commit();
  }
}
