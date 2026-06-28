import { findingType } from '../../core/models/finding';

export const findingTypes = {
  jestSymbol: findingType('jest-symbol'),
  vitestImportsNeeded: findingType('vitest-imports-needed'),
} as const;
