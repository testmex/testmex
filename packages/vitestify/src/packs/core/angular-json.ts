import {
  relativePath,
  type RelativePath,
} from '../../core/models/relative-path';

export const ANGULAR_JSON_PATH = relativePath('angular.json');
export const ANGULAR_BUILDERS_JEST_BUILDER = '@angular-builders/jest:run';

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

export function getAngularJestBuilderProjectRoots(
  angularJson: AngularJson,
): RelativePath[] {
  return Object.entries(angularJson.projects ?? {}).flatMap(([, project]) => {
    if (
      project.architect?.test?.builder !== ANGULAR_BUILDERS_JEST_BUILDER ||
      project.root == null
    ) {
      return [];
    }

    return [relativePath(project.root)];
  });
}
