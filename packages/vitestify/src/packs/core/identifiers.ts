import { findingType } from '../../core/models/finding';
import { fileTag } from '../../core/domain/workspace';

export const findingTypes = {
  angular: findingType('angular'),
  dom: findingType('dom'),
  react: findingType('react'),
  testingLibraryJestDom: findingType('testing-library-jest-dom'),
  testingLibraryReact: findingType('testing-library-react'),
} as const;

export const fileTags = {
  code: fileTag('code'),
  jestConfig: fileTag('jest-config'),
  jestSetup: fileTag('jest-setup'),
  snapshot: fileTag('snapshot'),
  test: fileTag('test'),
} as const;
