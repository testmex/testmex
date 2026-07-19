import type { ReadonlyWorkspace } from '../domain/workspace';
import type { CommandRunner } from '../ports/command-runner';
import type { EnricherStep } from './progress-tracker/enricher-step';
import type { WorkspaceEnrichment } from './workspace-state';

export interface EnricherOptions {
  commandRunner: CommandRunner;
  enricherStep: EnricherStep;
  workspace: ReadonlyWorkspace;
}

export interface Enricher {
  name: string;
  enrich(options: EnricherOptions): Promise<WorkspaceEnrichment>;
}

export function defineEnricher(args: Enricher): Enricher {
  return args;
}
