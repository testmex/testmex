import type { FileInfo, Project } from './workspace-info';

export type FindingType = string & { readonly [__findingTypeBrand]: true };

export function findingType(type: string): FindingType {
  return type as FindingType;
}

declare const __findingTypeBrand: unique symbol;

export interface Finding {
  type: FindingType;
  project: Project;
  file?: FileInfo;
}
