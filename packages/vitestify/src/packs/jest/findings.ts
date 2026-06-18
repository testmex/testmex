import { findingTag, findingType } from '../../core/models/finding';

export const findingTypes = {
  jestMockCall: findingType('jest-mock-call'),
} as const;

export const findingTags = {
  jest: findingTag('jest'),
} as const;
