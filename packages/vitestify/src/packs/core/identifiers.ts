import { fileTag } from '../../core/models/workspace-info';

export const fileTags = {
  jestConfig: fileTag('jest-config'),
  snapshot: fileTag('snapshot'),
  test: fileTag('test'),
} as const;
