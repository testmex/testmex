import {
  relativePath,
  type RelativePath,
} from '../../core/models/relative-path';

class NxWorkspaceInfraMother {
  constructor(private readonly _state: State = { appFiles: {} }) {}

  withApp(name: string) {
    return new NxWorkspaceInfraMother({
      ...this._state,
      name,
    });
  }

  withAppFile(appName: string, fileName: string, content: string) {
    if (this._state.name === undefined) {
      throw new Error('NxWorkspaceInfraMother: configure a workspace first');
    }

    if (appName !== this._state.name) {
      throw new Error(
        `NxWorkspaceInfraMother: app "${appName}" does not exist`,
      );
    }

    return new NxWorkspaceInfraMother({
      ...this._state,
      appFiles: {
        ...this._state.appFiles,
        [fileName]: content,
      },
    });
  }

  buildFiles(): Record<RelativePath, string> {
    if (this._state.name === undefined) {
      throw new Error('NxWorkspaceInfraMother: configure a workspace first');
    }

    const name = this._state.name;
    const root = `apps/${name}`;

    const files: Record<RelativePath, string> = {
      [relativePath('package.json')]: JSON.stringify({
        dependencies: {
          nx: '23.0.0',
        },
      }),
      [relativePath('nx.json')]: '{}',
      [relativePath(`${root}/project.json`)]: JSON.stringify({ name }),
    };

    for (const [fileName, content] of Object.entries(this._state.appFiles)) {
      files[relativePath(`${root}/${fileName}`)] = content;
    }

    return files;
  }

  buildCommands(): Record<string, string> {
    if (this._state.name === undefined) {
      throw new Error('NxWorkspaceInfraMother: configure a workspace first');
    }

    const name = this._state.name;
    const root = `apps/${name}`;

    return {
      ['npx nx add @nx/vitest']: '',
      ['npx nx graph --print']: JSON.stringify({
        graph: {
          nodes: {
            [name]: { name, data: { root } },
          },
        },
      }),
    };
  }
}

interface State {
  name?: string;
  appFiles: Record<string, string>;
}

export const nxWorkspaceMother = new NxWorkspaceInfraMother();
