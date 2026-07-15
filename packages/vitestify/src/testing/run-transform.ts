import { Analyzer } from '../pipeline/analyzer';
import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';
import type { Transform } from '../core/models/transform';
import type { CommandRunner } from '../core/ports/command-runner';
import { Transformer } from '../pipeline/transformer';

const nullCommandRunner: CommandRunner = {
  async run() {
    return '';
  },
};

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
  const transformer = new Transformer({
    commandRunner: nullCommandRunner,
    flushCommands: false,
    transforms,
  });
  await analyzer.analyze(workspace);
  await transformer.transform(workspace);
}
