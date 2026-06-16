import { angularJsonMother } from '../core/angular-json.mother';
import { relativePath, type RelativePath } from '../core/relative-path';

class AngularCliWorkspaceInfraMother {
  constructor(private readonly _name?: string) {}

  withApp(name: string) {
    return new AngularCliWorkspaceInfraMother(name);
  }

  buildFiles(): Record<RelativePath, string> {
    if (this._name === undefined) {
      throw new Error('AngularCliWorkspaceInfraMother: configure a workspace first');
    }

    const name = this._name;
    const root = `apps/${name}`;

    return {
      [relativePath('angular.json')]: angularJsonMother
        .withProject({ name, root })
        .buildString(),
    };
  }
}

export const angularCliWorkspaceMother = new AngularCliWorkspaceInfraMother();
