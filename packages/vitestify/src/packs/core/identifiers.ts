import { fileTag } from '../../core/models/workspace-info';

export const fileTags = {
  code: fileTag('code'),
  jestConfig: fileTag('jest-config'),
  snapshot: fileTag('snapshot'),
  test: fileTag('test'),
} as const;
