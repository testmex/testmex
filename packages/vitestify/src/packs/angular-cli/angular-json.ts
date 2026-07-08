import { relativePath } from '../../core/models/relative-path';

export const ANGULAR_JSON_PATH = relativePath('angular.json');

export interface AngularJson {
  projects?: Record<string, AngularJsonProject>;
}

export interface AngularJsonProject {
  root?: string;
  architect?: Record<string, AngularJsonTarget>;
}

export interface AngularJsonProjectWithRoot extends AngularJsonProject {
  root: string;
}

export interface AngularJsonTarget {
  builder: string;
  options?: Record<string, unknown>;
}
