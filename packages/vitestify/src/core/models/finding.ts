import type { Project } from '../domain/workspace';
import type { RelativePath } from './relative-path';

export type FindingType = string & { readonly [__findingTypeBrand]: true };

export function findingType(type: string): FindingType {
  return type as FindingType;
}

declare const __findingTypeBrand: unique symbol;

export interface Finding {
  type: FindingType;
  projects: Project[];
  filePath?: RelativePath;
}
