import type { CommandRunner } from '../ports/command-runner';
import type { LegacyStep } from '../ports/legacy-progress-reporter';
import type { ActivityStep } from './progress-tracker/activity-step';

export interface EnricherProgressStep extends LegacyStep {
  createActivityStep(message: string): ActivityStep;
}

export interface PipelineContext {
  commandRunner: CommandRunner;
  progressStep: LegacyStep;
}
