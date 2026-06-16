import { relativePath, type RelativePath } from '../core/relative-path';

class NxWorkspaceInfraMother {
  constructor(private readonly _name?: string) {}

  withApp(name: string) {
    return new NxWorkspaceInfraMother(name);
  }

  buildFiles(): Record<RelativePath, string> {
    if (this._name === undefined) {
      throw new Error('NxWorkspaceInfraMother: configure a workspace first');
    }

    const name = this._name;
    const root = `apps/${name}`;

    return {
      [relativePath('package.json')]: JSON.stringify({
        dependencies: {
          nx: '23.0.0',
        },
      }),
      [relativePath('nx.json')]: '{}',
      [relativePath(`${root}/project.json`)]: JSON.stringify({ name }),
    };
  }

  buildCommands(): Record<string, string> {
    if (this._name === undefined) {
      throw new Error('NxWorkspaceInfraMother: configure a workspace first');
    }

    const name = this._name;
    const root = `apps/${name}`;

    return {
      ['npx nx show projects --json']: JSON.stringify({
        projects: [{ name }],
      }),
      [`npx nx show project ${name} --json`]: JSON.stringify({
        name,
        root,
      }),
    };
  }
}

export const nxWorkspaceMother = new NxWorkspaceInfraMother();
