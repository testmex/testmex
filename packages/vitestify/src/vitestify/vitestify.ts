import type { Finding } from '../core/finding';
import { Tree } from '../core/tree';
import { createWorkspace, Workspace } from '../core/workspace';
import type { CommandRunner } from '../infra/command-runner';
import type { FileSystem } from '../infra/file-system';
import { heuristics } from '../packs/jest/index';
import { Scanner } from '../scanner/scanner';
import { transforms } from '../transforms/index';

export class Vitestify {
  private readonly _fileSystem: FileSystem;
  private readonly _scanner: Scanner;

  constructor(args: { commandRunner: CommandRunner; fileSystem: FileSystem }) {
    const { commandRunner, fileSystem } = args;
    this._fileSystem = fileSystem;
    this._scanner = new Scanner({ commandRunner, fileSystem });
  }

  async run(): Promise<void> {
    const tree = new Tree({ fileSystem: this._fileSystem });

    const workspaceInfo = await this._scanner.scanWorkspace();

    const workspace = createWorkspace(workspaceInfo, tree);

    const findings: Finding[] = [];
    for (const heuristic of heuristics) {
      findings.push(...(await heuristic.inspect(workspace)));
    }

    for (const transform of transforms) {
      await transform.apply(workspace, findings);
    }

    await tree.commit();
  }
}
