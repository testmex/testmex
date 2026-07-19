import { hasNx } from '../../../core/domain/tree-helpers/has-nx';
import { defineEnricher, type EnricherOptions } from '../../../core/models/enricher';
import type { EnricherProgressStep } from '../../../core/models/pipeline-context';
import { relativePath } from '../../../core/models/relative-path';

export const nxEnricher = defineEnricher({
  name: 'nx',
  async enrich(options) {
    const { workspace, progressStep } = options;

    if (!(await hasNx(workspace.tree))) {
      return {};
    }

    const graph = await _withNxGraphLoadingActivity(progressStep, () =>
      _runNxGraphCommand(options),
    );

    const projects = Object.values(graph.graph.nodes).map((node) => ({
      name: node.name,
      path: relativePath(node.data.root),
    }));

    progressStep.updateMessage(`${projects.length} project(s) detected`);

    return { projects };
  },
});

async function _withNxGraphLoadingActivity<T>(
  progressStep: EnricherOptions['progressStep'],
  run: () => Promise<T>,
): Promise<T> {
  if (_isEnricherProgressStep(progressStep)) {
    const activity = progressStep.createActivityStep('loading nx graph');
    try {
      return await run();
    } finally {
      activity.done();
    }
  }

  progressStep.updateMessage('loading nx graph');
  return run();
}

function _isEnricherProgressStep(
  progressStep: EnricherOptions['progressStep'],
): progressStep is EnricherProgressStep {
  return 'createActivityStep' in progressStep;
}

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
