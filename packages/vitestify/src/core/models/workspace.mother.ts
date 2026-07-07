import { FileSystemFake } from '../../core/ports/file-system.fake';
import { Tree } from '../domain/tree';
import { Workspace } from '../domain/workspace';
import { relativePath, type RelativePath } from './relative-path';
import {
  FileTag,
  fileTag,
  WorkspaceInfo,
  type FileInfo,
} from './workspace-info';

export function createTestingWorkspace(mother: WorkspaceMother): Workspace {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());
  const workspace = new Workspace({
    info: mother.buildWorkspaceInfo(),
    tree: new Tree({ fileSystem }),
  });

  for (const { path, tags } of Object.values(mother.buildFileInfos())) {
    for (const tag of tags) {
      workspace.tag(path, tag);
    }
  }

  return workspace;
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

    return new WorkspaceInfo({
      projects: [{ name, path: root }],
    });
  }

  buildFileInfos(): FileInfo[] {
    return Object.values(this._state.appFiles).map(({ path, tags }) => ({
      path,
      tags,
    }));
  }
}

interface State {
  name: string;
  appFiles: Record<string, WorkspaceFile>;
}

export class WorkspaceFileMother {
  constructor(private readonly _file: WorkspaceFile) {}

  static file({
    appName,
    content,
    fileName,
    tags = [],
  }: {
    appName: string;
    content: string;
    fileName: string;
    tags?: FileTag[];
  }): WorkspaceFileMother {
    return new WorkspaceFileMother({
      content,
      path: relativePath(`apps/${appName}/${fileName}`),
      tags,
    });
  }

  static packageJsonFile({
    dependencies,
  }: {
    dependencies: Record<string, string>;
  }): WorkspaceFileMother {
    return new WorkspaceFileMother({
      content: JSON.stringify({
        dependencies,
      }),
      path: relativePath('package.json'),
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
      tags: [fileTag('snapshot')],
    });
  }

  static testFile({
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
      path: relativePath(`apps/${appName}/${fileName}`),
      tags: [fileTag('test')],
    });
  }

  build(): WorkspaceFile {
    return this._file;
  }
}

interface WorkspaceFile {
  path: RelativePath;
  tags: FileTag[];
  content: string;
}
