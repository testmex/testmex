import type { CommandRunner } from '../ports/command-runner';
import type { LegacyStep } from '../ports/legacy-progress-reporter';

export interface PipelineContext {
  commandRunner: CommandRunner;
  progressStep: LegacyStep;
}
