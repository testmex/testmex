import { hasNx } from '../../../core/domain/tree-helpers/has-nx';
import { Enricher, type EnricherOptions } from '../../../core/models/enricher';
import { relativePath } from '../../../core/models/relative-path';

export class NxEnricher implements Enricher {
  readonly name = 'nx';

  async enrich({ workspace, onProgress, commandRunner }: EnricherOptions) {
    if (!(await hasNx(workspace.tree))) {
      return {};
    }

    onProgress?.('loading nx graph');
    const graph = await this._runNxGraphCommand(commandRunner);

    const projects = Object.values(graph.graph.nodes).map((node) => ({
      name: node.name,
      path: relativePath(node.data.root),
    }));

    onProgress?.(`${projects.length} project(s) detected`);

    return { projects };
  }

  private async _runNxGraphCommand(
    commandRunner: EnricherOptions['commandRunner'],
  ): Promise<NxGraph> {
    const raw = await commandRunner.run([
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
