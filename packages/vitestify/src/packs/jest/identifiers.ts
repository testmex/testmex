import { findingType } from '../../core/models/finding';
import { fileTag } from '../../core/models/workspace-info';

export const findingTypes = {
  jestSymbol: findingType('jest-symbol'),
  snapshot: findingType('snapshot'),
  vitestImportsNeeded: findingType('vitest-imports-needed'),
} as const;

export const fileTags = {
  jestConfig: fileTag('jest-config'),
} as const;
