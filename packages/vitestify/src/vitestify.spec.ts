import { describe, expect, it } from 'vitest';
import { relativePath } from './core/relative-path';
import { CommandRunnerFake } from './infra/command-runner.fake';
import { FileSystemFake } from './infra/file-system.fake';
import { nxWorkspaceMother } from './packs/nx/nx-workspace-infra.mother';
import { Vitestify } from './vitestify/vitestify';

describe('Vitestify', () => {
  it('applies transforms and commits', async () => {
    const { configureWorkspace, fileSystem, vitestify } = setUp();

    configureWorkspace(
      nxWorkspaceMother
        .withApp('my-app')
        .withAppFile('my-app', 'jest.config.ts', 'export default {}')
        .withAppFile('my-app', 'src/app.spec.ts', "jest.mock('./foo');"),
    );

    await vitestify.run();

    expect(
      await fileSystem.maybeReadFile(
        relativePath('apps/my-app/src/app.spec.ts'),
      ),
    ).toBe("vi.mock('./foo');");
  });
});

function setUp() {
  const commandRunner = new CommandRunnerFake();
  const fileSystem = new FileSystemFake();

  return {
    configureWorkspace: (mother: typeof nxWorkspaceMother) => {
      commandRunner.configure(mother.buildCommands());
      fileSystem.configure(mother.buildFiles());
    },
    fileSystem,
    vitestify: new Vitestify({ commandRunner, fileSystem }),
  };
}
