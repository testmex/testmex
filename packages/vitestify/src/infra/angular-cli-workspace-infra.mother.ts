import { angularJsonMother } from '../core/angular-json.mother';
import { relativePath, type RelativePath } from '../core/relative-path';

class AngularCliWorkspaceInfraMother {
  constructor(private readonly _state: State = {}) {}

  withApp(name: string) {
    return new AngularCliWorkspaceInfraMother({
      ...this._state,
      name,
    });
  }

  buildCommands(): Record<string, string> {
    return {};
  }

  buildFiles(): Record<RelativePath, string> {
    if (this._state.name === undefined) {
      throw new Error(
        'AngularCliWorkspaceInfraMother: configure a workspace first',
      );
    }

    const name = this._state.name;
    const root = `apps/${name}`;

    const files: Record<RelativePath, string> = {
      [relativePath('angular.json')]: angularJsonMother
        .withProject({ name, root })
        .buildString(),
    };

    return files;
  }
}

interface State {
  name?: string;
}

export const angularCliWorkspaceMother = new AngularCliWorkspaceInfraMother();
