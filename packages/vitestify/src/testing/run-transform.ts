import { Analyzer } from '../pipeline/analyzer';
import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';
import type { Transform } from '../core/models/transform';
import { Transformer } from '../pipeline/transformer';

export interface RunTransformOptions {
  workspace: Workspace;
  heuristics?: Heuristic[];
  transforms: Transform[];
}

export async function runTransform({
  workspace,
  heuristics = [],
  transforms,
}: RunTransformOptions): Promise<void> {
  const analyzer = new Analyzer({ heuristics });
  const transformer = new Transformer({ transforms });
  const findings = await analyzer.analyze(workspace);
  await transformer.transform({ findings, workspace });
}
