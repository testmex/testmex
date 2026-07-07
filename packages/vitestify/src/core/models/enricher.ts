import type { CommandRunner } from '../ports/command-runner';
import type { ReadonlyWorkspace } from '../domain/workspace';
import type {
  FileInfo,
  PackageManager,
  Project,
} from './workspace-info';

export interface EnrichResult {
  fileInfos?: FileInfo[];
  packageManager?: PackageManager;
  projects?: Project[];
}

export interface Enricher {
  enrich(workspace: ReadonlyWorkspace): Promise<EnrichResult>;
}

export interface EnricherFactoryArgs {
  commandRunner: CommandRunner;
}

export type EnricherFactory = (args: EnricherFactoryArgs) => Enricher;
