import {
  relativePath,
  type RelativePath,
} from '../../core/models/relative-path';

class NxWorkspaceInfraMother {
  constructor(private readonly _state: State = { appFiles: {}, libs: [] }) {}

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

  withLib(name: string, root: string) {
    return new NxWorkspaceInfraMother({
      ...this._state,
      libs: [...this._state.libs, { name, root }],
    });
  }

  withWorkspaceFile(filePath: string, content: string) {
    return new NxWorkspaceInfraMother({
      ...this._state,
      workspaceFiles: {
        ...this._state.workspaceFiles,
        [filePath]: content,
      },
    });
  }

  buildFiles(): Record<RelativePath, string> {
    if (!this._hasProjects()) {
      throw new Error('NxWorkspaceInfraMother: configure a workspace first');
    }

    const files: Record<RelativePath, string> = {
      [relativePath('package.json')]: JSON.stringify({
        dependencies: {
          nx: '23.0.0',
        },
      }),
      [relativePath('nx.json')]: '{}',
    };

    if (this._state.name !== undefined) {
      const name = this._state.name;
      const root = `apps/${name}`;

      files[relativePath(`${root}/project.json`)] = JSON.stringify({ name });

      for (const [fileName, content] of Object.entries(this._state.appFiles)) {
        files[relativePath(`${root}/${fileName}`)] = content;
      }
    }

    for (const lib of this._state.libs) {
      files[relativePath(`${lib.root}/project.json`)] = JSON.stringify({
        name: lib.name,
      });
    }

    for (const [filePath, content] of Object.entries(
      this._state.workspaceFiles ?? {},
    )) {
      files[relativePath(filePath)] = content;
    }

    return files;
  }

  buildCommands(): Record<string, string> {
    if (!this._hasProjects()) {
      throw new Error('NxWorkspaceInfraMother: configure a workspace first');
    }

    const nodes: Record<string, { name: string; data: { root: string } }> = {};

    if (this._state.name !== undefined) {
      const name = this._state.name;
      nodes[name] = { name, data: { root: `apps/${name}` } };
    }

    for (const lib of this._state.libs) {
      nodes[lib.name] = { name: lib.name, data: { root: lib.root } };
    }

    return {
      ['pnpm add -D vite-tsconfig-paths']: '',
      ['pnpm add -D vitest']: '',
      ['npx nx add @nx/vitest']: '',
      ['npx nx graph --print']: JSON.stringify({
        graph: { nodes },
      }),
    };
  }

  private _hasProjects(): boolean {
    return (
      this._state.name !== undefined || this._state.libs.length > 0
    );
  }
}

interface State {
  name?: string;
  appFiles: Record<string, string>;
  libs: Array<{ name: string; root: string }>;
  workspaceFiles?: Record<string, string>;
}

export const nxWorkspaceMother = new NxWorkspaceInfraMother();
