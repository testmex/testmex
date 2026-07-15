import type { ReadonlyWorkspace } from '../domain/workspace';
import type { PipelineContext } from './pipeline-context';
import type { WorkspaceEnrichment } from './workspace-state';

export interface EnricherOptions extends PipelineContext {
  workspace: ReadonlyWorkspace;
}

export interface Enricher {
  name: string;
  enrich(options: EnricherOptions): Promise<WorkspaceEnrichment>;
}
