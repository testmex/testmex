import type { CommandRunner } from '../../infra/command-runner.impl';
import type { ReadonlyTree } from '../domain/tree';
import type { WorkspaceInfo } from './workspace-info';

export interface Enricher {
  enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo>;
}

export interface EnricherFactoryArgs {
  tree: ReadonlyTree;
  commandRunner: CommandRunner;
}

export type EnricherFactory = (args: EnricherFactoryArgs) => Enricher;
