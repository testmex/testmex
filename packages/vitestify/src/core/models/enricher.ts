import type { CommandRunner } from '../ports/command-runner';
import type { ReadonlyWorkspace } from '../domain/workspace';
import type { WorkspaceEnrichment } from './workspace-info';

export interface EnricherOptions {
  workspace: ReadonlyWorkspace;
  onProgress(detail: string): void;
}

export interface Enricher {
  name: string;
  enrich(options: EnricherOptions): Promise<WorkspaceEnrichment>;
}

export interface EnricherFactoryArgs {
  commandRunner: CommandRunner;
}

export type EnricherFactory = (args: EnricherFactoryArgs) => Enricher;

export interface DefineEnricherArgs {
  name: string;
  enrich: (options: EnricherOptions) => Promise<WorkspaceEnrichment>;
}

/**
 * @deprecated 🚧 work in progress
 */
export function defineEnricher(_args: DefineEnricherArgs): Enricher {
  throw new Error('🚧 work in progress');
}
