import { hasNx } from '../../../core/domain/tree-helpers/has-nx';
import {
  defineEnricher,
  type EnricherOptions,
} from '../../../core/models/enricher';
import type { EnricherStep } from '../../../core/models/progress-tracker/enricher-step';
import { relativePath } from '../../../core/models/relative-path';

export const nxEnricher = defineEnricher({
  name: 'nx',
  async enrich(options) {
    const { enricherStep, workspace } = options;

    if (!(await hasNx(workspace.tree))) {
      return {};
    }

    const { graph } = await _withNxGraphLoadingActivity(enricherStep, () =>
      _runNxGraphCommand(options),
    );

    const projects = Object.values(graph.nodes).map((node) => ({
      name: node.name,
      path: relativePath(node.data.root),
    }));

    return { projects };
  },
});

async function _withNxGraphLoadingActivity<T>(
  enricherStep: EnricherStep,
  run: () => Promise<T>,
): Promise<T> {
  const childStep = enricherStep.createChildStep('loading nx graph');
  try {
    return await run();
  } finally {
    childStep.done();
  }
}

async function _runNxGraphCommand(
  options: EnricherOptions,
): Promise<NxGraphResult> {
  const raw = await options.commandRunner.run([
    'npx',
    'nx',
    'graph',
    '--print',
  ]);
  return JSON.parse(raw);
}

interface NxGraphResult {
  graph: {
    nodes: Record<string, { name: string; data: { root: string } }>;
  };
}
