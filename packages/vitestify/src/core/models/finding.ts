import type { RelativePath } from './relative-path';

export type FindingType = string & { readonly [__findingTypeBrand]: true };

export function findingType(type: string): FindingType {
  return type as FindingType;
}

declare const __findingTypeBrand: unique symbol;

export interface HeuristicResult {
  findings: { type: FindingType; filePath: RelativePath }[];
}
