import { findingType } from '../../core/models/finding';
import { fileTag } from '../../core/models/workspace-info';

export const findingTypes = {
  dom: findingType('dom'),
  testingLibraryJestDom: findingType('testing-library-jest-dom'),
} as const;

export const fileTags = {
  code: fileTag('code'),
  jestConfig: fileTag('jest-config'),
  snapshot: fileTag('snapshot'),
  test: fileTag('test'),
} as const;
