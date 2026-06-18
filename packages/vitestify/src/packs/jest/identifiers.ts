import { findingTag, findingType } from '../../core/models/finding';
import { projectFileTag } from '../../core/models/workspace-info';

export const findingTypes = {
  defaultExportMockFactory: findingType('default-export-mock-factory'),
  factoryFuncSetMock: findingType('factory-func-set-mock'),
  jestGlobalsImportFromGlobals: findingType('jest-globals-import-from-globals'),
  jestGlobalsImportFromJest: findingType('jest-globals-import-from-jest'),
  jestMockCall: findingType('jest-mock-call'),
  jestSetTimeoutCall: findingType('jest-set-timeout-call'),
  jestSnapshotFile: findingType('jest-snapshot-file'),
  jestTypesUsage: findingType('jest-types'),
  jestViCall: findingType('jest-vi-call'),
  replaceApiUsage: findingType('replace-api-usage'),
  vitestImportsNeeded: findingType('vitest-imports-needed'),
} as const;

export const findingTags = {
  jest: findingTag('jest'),
  vitestImports: findingTag('vitest-imports'),
} as const;

export const projectFileTags = {
  jestConfig: projectFileTag('jest-config'),
} as const;
