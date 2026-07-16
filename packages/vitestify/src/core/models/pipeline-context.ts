import type { CommandRunner } from '../ports/command-runner';
import type { Step } from '../ports/progress-reporter';

export interface PipelineContext {
  commandRunner: CommandRunner;
  progressStep: Step;
}
