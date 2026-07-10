import { hasNx } from '../../../core/domain/tree-helpers/has-nx';
import { Enricher } from '../../../core/models/enricher';
import type { ReadonlyWorkspace } from '../../../core/domain/workspace';
import { relativePath } from '../../../core/models/relative-path';
import type { CommandRunner } from '../../../core/ports/command-runner';

export class NxEnricher implements Enricher {
  private readonly _commandRunner: CommandRunner;

  constructor({ commandRunner }: { commandRunner: CommandRunner }) {
    this._commandRunner = commandRunner;
  }

  async enrich(workspace: ReadonlyWorkspace) {
    if (!(await hasNx(workspace.tree))) {
      return {};
    }

    const graph = await this._runNxGraphCommand();

    return {
      projects: Object.values(graph.graph.nodes).map((node) => ({
        name: node.name,
        path: relativePath(node.data.root),
      })),
    };
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
