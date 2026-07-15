import { hasNx } from '../../../core/domain/tree-helpers/has-nx';
import { defineEnricher, type EnricherOptions } from '../../../core/models/enricher';
import { relativePath } from '../../../core/models/relative-path';

export const nxEnricher = defineEnricher({
  name: 'nx',
  async enrich({ workspace, onProgress, commandRunner }) {
    if (!(await hasNx(workspace.tree))) {
      return {};
    }

    onProgress?.('loading nx graph');
    const graph = await _runNxGraphCommand(commandRunner);

    const projects = Object.values(graph.graph.nodes).map((node) => ({
      name: node.name,
      path: relativePath(node.data.root),
    }));

    onProgress?.(`${projects.length} project(s) detected`);

    return { projects };
  },
});

async function _runNxGraphCommand(
  commandRunner: EnricherOptions['commandRunner'],
): Promise<NxGraph> {
  const raw = await commandRunner.run(['npx', 'nx', 'graph', '--print']);
  return JSON.parse(raw);
}

interface NxGraph {
  graph: {
    nodes: Record<string, { name: string; data: { root: string } }>;
  };
}
