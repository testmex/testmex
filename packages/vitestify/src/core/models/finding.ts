import type { Project, ProjectFile } from './workspace-info';

export type FindingTag = string & { readonly [__findingTagBrand]: true };

export function findingTag(tag: string): FindingTag {
  return tag as FindingTag;
}

declare const __findingTagBrand: unique symbol;

export type FindingType = string & { readonly [__findingTypeBrand]: true };

export function findingType(type: string): FindingType {
  return type as FindingType;
}

declare const __findingTypeBrand: unique symbol;

export interface Finding {
  type: FindingType;
  tags: FindingTag[];
  description: string;
  project: Project;
  file?: ProjectFile;
}
