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

export function createTestingWorkspace(mother: WorkspaceMother): Workspace {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());

  return defineWorkspace({
    info: mother.buildWorkspaceInfo(),
    tree: new Tree({ fileSystem }),
  });
}

export class WorkspaceMother {
  constructor(private readonly _state: State) {}

  static withApp(name: string): WorkspaceMother {
    return new WorkspaceMother({
      name,
      appFiles: {},
    });
  }

  withFile(file: WorkspaceFile) {
    return new WorkspaceMother({
      ...this._state,
      appFiles: {
        ...this._state.appFiles,
        [file.path]: file,
      },
    });
  }

  buildFiles(): Record<RelativePath, string> {
    const files: Record<RelativePath, string> = {};

    for (const file of Object.values(this._state.appFiles)) {
      files[file.path] = file.content;
    }

    return files;
  }

  buildWorkspaceInfo(): WorkspaceInfo {
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
  name: string;
  appFiles: Record<string, WorkspaceFile>;
}

export class WorkspaceFileMother {
  constructor(private readonly _file: WorkspaceFile) {}

  static file(
    appName: string,
    content: string,
    fileName: string,
  ): WorkspaceFileMother {
    return new WorkspaceFileMother({
      content,
      path: relativePath(`apps/${appName}/${fileName}`),
      tags: [],
    });
  }

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
