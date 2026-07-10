import { hasNx } from '../../../core/domain/tree-helpers/has-nx';
import { Enricher, type EnricherOptions } from '../../../core/models/enricher';
import { relativePath } from '../../../core/models/relative-path';
import type { CommandRunner } from '../../../core/ports/command-runner';

export class NxEnricher implements Enricher {
  readonly name = 'nx';

  private readonly _commandRunner: CommandRunner;

  constructor({ commandRunner }: { commandRunner: CommandRunner }) {
    this._commandRunner = commandRunner;
  }

  async enrich({ workspace, onProgress }: EnricherOptions) {
    if (!(await hasNx(workspace.tree))) {
      return {};
    }

    onProgress?.('loading nx graph');
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
