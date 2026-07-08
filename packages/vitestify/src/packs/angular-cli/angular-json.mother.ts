import type { AngularJson } from '../core/angular-json';

class AngularJsonMother {
  constructor(private readonly _config: AngularJson = { projects: {} }) {}

  withProject({ name, root }: { name: string; root: string }) {
    return new AngularJsonMother({
      ...this._config,
      projects: {
        ...this._config.projects,
        [name]: { root },
      },
    });
  }

  withTarget({
    projectName,
    targetName,
    builder,
  }: {
    projectName: string;
    targetName: string;
    builder: string;
  }) {
    const project = this._config.projects?.[projectName];

    if (project == null) {
      throw new Error(
        `AngularJsonMother: project "${projectName}" is not configured`,
      );
    }

    return new AngularJsonMother({
      ...this._config,
      projects: {
        ...this._config.projects,
        [projectName]: {
          ...project,
          architect: {
            ...project.architect,
            [targetName]: {
              builder,
            },
          },
        },
      },
    });
  }

  build() {
    return this._config;
  }

  buildString() {
    return JSON.stringify(this._config, null, 2);
  }
}

export const angularJsonMother = new AngularJsonMother();
