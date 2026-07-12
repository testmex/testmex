import { findingType } from '../../core/models/finding';

export const findingTypes = {
  jestFocusSkipShorthand: findingType('jest-focus-skip-shorthand'),
  jestSymbol: findingType('jest-symbol'),
  vitestImportsNeeded: findingType('vitest-imports-needed'),
} as const;
