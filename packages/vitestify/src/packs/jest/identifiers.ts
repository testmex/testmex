import { findingType } from '../../core/models/finding';
import { fileTag } from '../../core/models/workspace-info';

export const findingTypes = {
  jestConfig: findingType('jest-config'),
  jestSymbol: findingType('jest-symbol'),
  snapshot: findingType('snapshot'),
  vitestImportsNeeded: findingType('vitest-imports-needed'),
} as const;

export const projectFileTags = {
  jestConfig: fileTag('jest-config'),
} as const;
