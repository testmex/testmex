import type { ReadonlyTree } from '../../core/domain/tree';
import { hasNx } from '../../core/domain/tree-helpers/has-nx';
import { Enricher } from '../../core/models/enricher';
import { relativePath } from '../../core/models/relative-path';
import { WorkspaceInfo } from '../../core/models/workspace-info';
import type { CommandRunner } from '../../core/ports/command-runner';

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
    if (!(await hasNx(this._tree))) {
      return workspaceInfo;
    }

    const graph = await this._runNxGraphCommand();

    return workspaceInfo.merge({
      projects: Object.values(graph.graph.nodes).map((node) => ({
        name: node.name,
        path: relativePath(node.data.root),
      })),
    });
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
