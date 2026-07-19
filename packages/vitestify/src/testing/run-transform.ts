import type { Workspace } from '../core/domain/workspace';
import type { Heuristic } from '../core/models/heuristic';
import { ProgressTracker } from '../core/models/progress-tracker';
import type { Transform } from '../core/models/transform';
import {
  CommandRunnerFake,
  ExecutedCommand,
} from '../core/ports/command-runner.fake';
import { Analyzer } from '../pipeline/analyzer';
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
}: RunTransformOptions): Promise<{ commands: readonly ExecutedCommand[] }> {
  const commandRunner = new CommandRunnerFake();
  const progressTracker = new ProgressTracker();
  const analyzer = new Analyzer({ heuristics, progressTracker });
  const transformer = new Transformer({
    commandRunner,
    transforms,
    progressTracker,
  });
  await analyzer.analyze(workspace);
  await transformer.transform(workspace);
  return {
    commands: commandRunner.executedCommands(),
  };
}
