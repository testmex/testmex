import { fileTag } from '../../core/models/workspace-info';

export const projectFileTags = {
  jestConfig: fileTag('jest-config'),
  snapshot: fileTag('snapshot'),
  test: fileTag('test'),
} as const;
