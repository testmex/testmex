import { findingTag, findingType } from '../../core/models/finding';
import { projectFileTag } from '../../core/models/workspace-info';

export const findingTypes = {
  jestMockCall: findingType('jest-mock-call'),
} as const;

export const findingTags = {
  jest: findingTag('jest'),
} as const;

export const projectFileTags = {
  jestConfig: projectFileTag('jest-config'),
} as const;
