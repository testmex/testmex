import type { CommandRunner } from '../ports/command-runner';
import type { ReadonlyWorkspace } from '../domain/workspace';
import type { WorkspaceEnrichment } from './workspace-info';

export interface Enricher {
  enrich(workspace: ReadonlyWorkspace): Promise<WorkspaceEnrichment>;
}

export interface EnricherFactoryArgs {
  commandRunner: CommandRunner;
}

export type EnricherFactory = (args: EnricherFactoryArgs) => Enricher;
