import { relativePath } from '../../core/models/relative-path';
import {
  mergeWorkspaceInfo,
  WorkspaceInfo,
} from '../../core/models/workspace-info';
import type { CommandRunner } from '../../core/ports/command-runner';
import { Enricher } from '../../core/models/enricher';
import type { ReadonlyTree } from '../../core/domain/tree';

export class NxEnricher implements Enricher {
  private readonly _commandRunner: CommandRunner;
  private readonly _tree: ReadonlyTree;

  constructor({
    commandRunner,
    tree,
  }: {
    commandRunner: CommandRunner;
    tree: ReadonlyTree;
  }) {
    this._commandRunner = commandRunner;
    this._tree = tree;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    if (!(await this._isNx())) {
      return workspaceInfo;
    }

    const graph = await this._runNxGraphCommand();

    return mergeWorkspaceInfo(workspaceInfo, {
      workspaceType: 'nx',
      projects: Object.values(graph.graph.nodes).map((node) => ({
        name: node.name,
        path: relativePath(node.data.root),
        files: [],
      })),
    });
  }

  private async _isNx(): Promise<boolean> {
    const packageJsonString = await this._tree.maybeReadFile(
      relativePath('package.json'),
    );

    if (packageJsonString === null) {
      return false;
    }

    const packageJson: PackageJson = JSON.parse(packageJsonString);

    const nxPackageName = 'nx';
    return (
      nxPackageName in packageJson.dependencies ||
      nxPackageName in packageJson.devDependencies
    );
  }

  private async _runNxGraphCommand(): Promise<NxGraph> {
    const raw = await this._commandRunner.run([
      'npx',
      'nx',
      'graph',
      '--print',
    ]);
    return JSON.parse(raw);
  }
}

interface NxGraph {
  graph: {
    nodes: Record<string, { name: string; data: { root: string } }>;
  };
}

interface PackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}
