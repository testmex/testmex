import { FileSystemFake } from '../infra/file-system.fake';
import { relativePath, type RelativePath } from './relative-path';
import { Tree } from './tree';
import { defineWorkspace, type Workspace } from './workspace';
import {
  projectFileTag,
  type ProjectFile,
  type WorkspaceInfo,
} from './workspace-info';

class WorkspaceMother {
  constructor(private readonly _state: State = { appFiles: {} }) {}

  withApp(name: string) {
    return new WorkspaceMother({
      ...this._state,
      name,
    });
  }

  withAppFile(appName: string, fileName: string, content: string) {
    if (this._state.name === undefined) {
      throw new Error('WorkspaceMother: configure a workspace first');
    }

    if (appName !== this._state.name) {
      throw new Error(`WorkspaceMother: app "${appName}" does not exist`);
    }

    return new WorkspaceMother({
      ...this._state,
      appFiles: {
        ...this._state.appFiles,
        [fileName]: content,
      },
    });
  }

  buildFiles(): Record<RelativePath, string> {
    if (this._state.name === undefined) {
      throw new Error('WorkspaceMother: configure a workspace first');
    }

    const name = this._state.name;
    const root = `apps/${name}`;
    const files: Record<RelativePath, string> = {};

    for (const [fileName, content] of Object.entries(this._state.appFiles)) {
      files[relativePath(`${root}/${fileName}`)] = content;
    }

    return files;
  }

  buildWorkspaceInfo(): WorkspaceInfo {
    if (this._state.name === undefined) {
      throw new Error('WorkspaceMother: configure a workspace first');
    }

    const name = this._state.name;
    const root = relativePath(`apps/${name}`);

    const files: ProjectFile[] = Object.keys(this._state.appFiles).map(
      (fileName) => ({
        path: relativePath(`apps/${name}/${fileName}`),
        tags: fileName.endsWith('.spec.ts') ? [projectFileTag.test] : [],
      }),
    );

    return {
      workspaceType: 'nx',
      projects: [
        {
          name,
          path: root,
          files,
        },
      ],
    };
  }
}

interface State {
  name?: string;
  appFiles: Record<string, string>;
}

export const workspaceMother = new WorkspaceMother();

export function createTestingWorkspace(mother: WorkspaceMother): Workspace {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  return defineWorkspace({
    info: mother.buildWorkspaceInfo(),
    tree: new Tree({ fileSystem }),
  });
}
