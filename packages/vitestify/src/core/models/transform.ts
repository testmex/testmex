import type { Finding } from './finding';
import type { Workspace } from '../domain/workspace';

export interface Transform {
  apply({
    findings,
    workspace,
  }: {
    findings: Finding[];
    workspace: Workspace;
  }): Promise<void>;
}
