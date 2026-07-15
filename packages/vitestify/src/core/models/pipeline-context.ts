import type { CommandRunner } from '../ports/command-runner';

export interface PipelineContext {
  commandRunner: CommandRunner;
  onProgress?(detail: string): void;
}
