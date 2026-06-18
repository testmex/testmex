import { findingTag, findingType } from '../../core/finding';

export const findingTypes = {
  jestMockCall: findingType('jest-mock-call'),
} as const;

export const findingTags = {
  jest: findingTag('jest'),
} as const;
