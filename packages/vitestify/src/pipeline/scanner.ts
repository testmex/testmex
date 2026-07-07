import debug from 'debug';
import { EnricherFactory, type EnrichResult } from '../core/models/enricher';
import { Tree } from '../core/domain/tree';
import { ReadonlyWorkspace, Workspace } from '../core/domain/workspace';
import {
  createWorkspaceInfo,
  type WorkspaceInfo,
} from '../core/models/workspace-info';
import type { CommandRunner } from '../core/ports/command-runner';
import type { FileSystem } from '../core/ports/file-system';

const log = debug('vitestify:scanner');

export class Scanner {
  private readonly _commandRunner: CommandRunner;
  private readonly _enricherFactories: EnricherFactory[];
  private readonly _fileSystem: FileSystem;

  constructor(args: {
    commandRunner: CommandRunner;
    enricherFactories: EnricherFactory[];
    fileSystem: FileSystem;
  }) {
    this._commandRunner = args.commandRunner;
    this._enricherFactories = args.enricherFactories;
    this._fileSystem = args.fileSystem;
  }

  async scanWorkspace(): Promise<Workspace> {
    log('scanning workspace');
    const tree = new Tree({ fileSystem: this._fileSystem });
    const enrichers = this._enricherFactories.map((factory) =>
      factory({ commandRunner: this._commandRunner }),
    );

    let workspaceInfo = createWorkspaceInfo();
    let count = 0;
    for (const enricher of enrichers) {
      const workspace = new ReadonlyWorkspace({ info: workspaceInfo, tree });
      const result = await enricher.enrich(workspace);

      workspaceInfo = _applyEnrichResult(tree, workspaceInfo, result);
      count = tree.getFiles().length;
      if (count > 0) {
        log(`found ${count} files`);
      }
    }

    if (count === 0) {
      log('no files found');
    }

    return new Workspace({ info: workspaceInfo, tree });
  }
}

function _applyEnrichResult(
  tree: Tree,
  workspaceInfo: WorkspaceInfo,
  result: EnrichResult,
): WorkspaceInfo {
  for (const fileInfo of result.fileInfos ?? []) {
    for (const tag of fileInfo.tags) {
      tree.tag(fileInfo.path, tag);
    }
  }

  return workspaceInfo.merge({
    projects: result.projects,
    packageManager: result.packageManager,
  });
}
