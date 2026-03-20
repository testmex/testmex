class AngularJsonMother {
  constructor(private readonly _config: AngularJsonConfig = { projects: {} }) {}

  withProject({ name, root }: { name: string; root: string }) {
    return new AngularJsonMother({
      ...this._config,
      projects: {
        ...this._config.projects,
        [name]: { root },
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

interface AngularJsonConfig {
  projects: Record<string, { root: string }>;
}

export const angularJsonMother = new AngularJsonMother();
