import { FileSystemFake } from '../../core/ports/file-system.fake';
import { relativePath, type RelativePath } from './relative-path';
import { Tree } from '../domain/tree';
import { defineWorkspace, type Workspace } from '../domain/workspace';
import {
  ProjectFileTag,
  projectFileTag,
  type ProjectFile,
  type WorkspaceInfo,
} from './workspace-info';

export class WorkspaceMother {
  constructor(private readonly _state: State = { appFiles: {} }) {}

  withApp(name: string) {
    return new WorkspaceMother({
      ...this._state,
      name,
    });
  }

  withWorkspaceFile(file: WorkspaceFile) {
    return new WorkspaceMother({
      ...this._state,
      appFiles: {
        ...this._state.appFiles,
        [file.path]: file,
      },
    });
  }

  withFile({
    appName,
    fileName,
    content,
  }: {
    appName: string;
    fileName: string;
    content: string;
  }) {
    if (this._state.name === undefined) {
      throw new Error('WorkspaceMother: configure a workspace first');
    }

    if (appName !== this._state.name) {
      throw new Error(`WorkspaceMother: app "${appName}" does not exist`);
    }

    const path = relativePath(`apps/${appName}/${fileName}`);

    return new WorkspaceMother({
      ...this._state,
      appFiles: {
        ...this._state.appFiles,
        [path]: {
          path,
          tags: inferProjectFileTags(fileName),
          content,
        },
      },
    });
  }

  buildFiles(): Record<RelativePath, string> {
    if (this._state.name === undefined) {
      throw new Error('WorkspaceMother: configure a workspace first');
    }

    const files: Record<RelativePath, string> = {};

    for (const file of Object.values(this._state.appFiles)) {
      files[file.path] = file.content;
    }

    return files;
  }

  buildWorkspaceInfo(): WorkspaceInfo {
    if (this._state.name === undefined) {
      throw new Error('WorkspaceMother: configure a workspace first');
    }

    const name = this._state.name;
    const root = relativePath(`apps/${name}`);

    const files: ProjectFile[] = Object.values(this._state.appFiles).map(
      ({ path, tags }) => ({ path, tags }),
    );

    return {
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
  appFiles: Record<string, WorkspaceFile>;
}

function inferProjectFileTags(fileName: string): ProjectFileTag[] {
  if (fileName.endsWith('.snap')) {
    return [projectFileTag('snapshot')];
  }
  if (fileName.endsWith('.spec.ts') || fileName.endsWith('.spec.tsx')) {
    return [projectFileTag('test')];
  }
  return [];
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

export class WorkspaceFileMother {
  constructor(private readonly _file: WorkspaceFile) {}

  static snapshotFile({
    appName,
    content,
    fileName,
  }: {
    appName: string;
    content: string;
    fileName: string;
  }): WorkspaceFileMother {
    return new WorkspaceFileMother({
      content,
      path: relativePath(`apps/${appName}/__snapshots__/${fileName}`),
      tags: [projectFileTag('snapshot')],
    });
  }

  static testFile(
    appName: string,
    content: string,
    fileName: string,
  ): WorkspaceFileMother {
    return new WorkspaceFileMother({
      content,
      path: relativePath(`apps/${appName}/${fileName}`),
      tags: [projectFileTag('test')],
    });
  }

  build(): WorkspaceFile {
    return this._file;
  }
}

interface WorkspaceFile {
  path: RelativePath;
  tags: ProjectFileTag[];
  content: string;
}
