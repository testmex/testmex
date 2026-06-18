import type { RelativePath } from './relative-path';

export type CreateChange = {
  type: 'create';
  path: RelativePath;
  content: string;
};

export type DeleteChange = { type: 'delete'; path: RelativePath };

export type UpdateChange = {
  type: 'update';
  path: RelativePath;
  content: string;
  originalPath?: RelativePath;
};

export type Change = CreateChange | UpdateChange | DeleteChange;
