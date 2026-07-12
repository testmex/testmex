import { angularJsonMother } from './angular-json.mother';
import { ANGULAR_JSON_PATH } from '../core/angular-json';
import { type RelativePath } from '../../core/models/relative-path';
import type { CommandRunnerResult } from '../../core/ports/command-runner.fake';

class AngularCliWorkspaceInfraMother {
  constructor(private readonly _state: State = {}) {}

  withApp(name: string) {
    return new AngularCliWorkspaceInfraMother({
      ...this._state,
      name,
    });
  }

  buildCommands(): Record<string, CommandRunnerResult> {
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
      [ANGULAR_JSON_PATH]: angularJsonMother
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
