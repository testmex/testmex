import { FileSystemFake } from '../../core/ports/file-system.fake';
import { Tree } from '../domain/tree';
import {
  Workspace,
  FileTag,
  fileTag,
  type FileInfo,
} from '../domain/workspace';
import { relativePath, type RelativePath } from './relative-path';
import { WorkspaceState } from './workspace-state';

export function createTestingWorkspace(mother: WorkspaceMother): Workspace {
  const fileSystem = new FileSystemFake();
  fileSystem.configure(mother.buildFiles());
  return new Workspace({
    state: mother.buildWorkspaceState(),
    tree: new Tree({ fileSystem }),
  });
}

export class WorkspaceMother {
  constructor(private readonly _state: WorkspaceMotherState) {}

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

  buildWorkspaceState(): WorkspaceState {
    const name = this._state.name;
    const root = relativePath(`apps/${name}`);

    const state = new WorkspaceState({
      projects: [{ name, path: root }],
    });

    for (const { path, tags } of Object.values(this._state.appFiles)) {
      for (const tag of tags) {
        state.tag(path, tag);
      }
    }

    return state;
  }

  buildFileInfos(): FileInfo[] {
    return Object.values(this._state.appFiles).map(({ path, tags }) => ({
      path,
      tags,
      findings: [],
    }));
  }
}

/**
 * This is the internal state of the WorkspaceMother class.
 * Do not mixup with WorkspaceState.
 */
interface WorkspaceMotherState {
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
