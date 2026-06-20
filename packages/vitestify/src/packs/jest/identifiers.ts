import { findingType } from '../../core/models/finding';
import { projectFileTag } from '../../core/models/workspace-info';

export const findingTypes = {
  jestSymbol: findingType('jest-symbol'),
  snapshot: findingType('snapshot'),
  vitestImportsNeeded: findingType('vitest-imports-needed'),
} as const;

export const projectFileTags = {
  jestConfig: projectFileTag('jest-config'),
} as const;
