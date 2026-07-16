import { hasNx } from '../../../core/domain/tree-helpers/has-nx';
import { defineEnricher, type EnricherOptions } from '../../../core/models/enricher';
import { relativePath } from '../../../core/models/relative-path';

export const nxEnricher = defineEnricher({
  name: 'nx',
  async enrich(options) {
    const { workspace, progressStep } = options;

    if (!(await hasNx(workspace.tree))) {
      return {};
    }

    progressStep.updateMessage('loading nx graph');
    const graph = await _runNxGraphCommand(options);

    const projects = Object.values(graph.graph.nodes).map((node) => ({
      name: node.name,
      path: relativePath(node.data.root),
    }));

    progressStep.updateMessage(`${projects.length} project(s) detected`);

    return { projects };
  },
});

async function _runNxGraphCommand(
  options: EnricherOptions,
): Promise<NxGraph> {
  const raw = await options.commandRunner.run(['npx', 'nx', 'graph', '--print']);
  return JSON.parse(raw);
}

interface NxGraph {
  graph: {
    nodes: Record<string, { name: string; data: { root: string } }>;
  };
}
