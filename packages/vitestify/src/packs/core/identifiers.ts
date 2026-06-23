import { fileTag } from '../../core/models/workspace-info';

export const projectFileTags = {
  snapshot: fileTag('snapshot'),
  test: fileTag('test'),
} as const;
