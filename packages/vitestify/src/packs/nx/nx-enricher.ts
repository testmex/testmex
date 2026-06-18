import { relativePath } from '../../core/relative-path';
import { mergeWorkspaceInfo, WorkspaceInfo } from '../../core/workspace-info';
import { CommandRunner } from '../../infra/command-runner';
import { FileSystem } from '../../infra/file-system';
import { Enricher } from '../../scanner/enricher';

export class NxEnricher implements Enricher {
  private readonly _commandRunner: CommandRunner;
  private readonly _fileSystem: FileSystem;
  constructor({
    commandRunner,
    fileSystem,
  }: {
    commandRunner: CommandRunner;
    fileSystem: FileSystem;
  }) {
    this._commandRunner = commandRunner;
    this._fileSystem = fileSystem;
  }

  async enrich(workspaceInfo: WorkspaceInfo): Promise<WorkspaceInfo> {
    if (!(await this._isNx())) {
      return workspaceInfo;
    }

    const projectNames = await this._runNxJsonCommand('show projects');
    const projects = await Promise.all(
      projectNames.projects.map((project) =>
        this._runNxJsonCommand('show project', project.name),
      ),
    );

    return mergeWorkspaceInfo(workspaceInfo, {
      workspaceType: 'nx',
      projects: projects.map((project) => ({
        name: project.name,
        path: relativePath(project.root),
        files: [],
      })),
    });
  }

  private async _isNx(): Promise<boolean> {
    const packageJsonString = await this._fileSystem.maybeReadFile(
      relativePath('package.json'),
    );

    if (packageJsonString === null) {
      return false;
    }

    const packageJson: PackageJson = JSON.parse(packageJsonString);

    const nxPackageName = 'nx';
    return (
      nxPackageName in packageJson.dependencies ||
      nxPackageName in packageJson.devDependencies
    );
  }

  private async _runNxJsonCommand(
    command: 'show projects',
    ...args: []
  ): Promise<{
    projects: {
      name: string;
      root: string;
    }[];
  }>;
  private async _runNxJsonCommand(
    command: 'show project',
    ...args: [string]
  ): Promise<{
    name: string;
    root: string;
  }>;
  private async _runNxJsonCommand(
    command: string,
    ...args: string[]
  ): Promise<unknown> {
    const raw = await this._commandRunner.run([
      'npx',
      'nx',
      ...command.split(' '),
      ...args,
      '--json',
    ]);
    return JSON.parse(raw);
  }
}

interface PackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}
