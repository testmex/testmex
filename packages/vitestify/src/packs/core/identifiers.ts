import { projectFileTag } from '../../core/models/workspace-info';

export const projectFileTags = {
  snapshot: projectFileTag('snapshot'),
  test: projectFileTag('test'),
} as const;
