import type { Finding } from './finding';
import type { ReadonlyWorkspace } from './workspace';

export interface Transform {
  apply({
    findings,
    workspace,
  }: {
    findings: Finding[];
    workspace: ReadonlyWorkspace;
  }): Promise<void>;
}
