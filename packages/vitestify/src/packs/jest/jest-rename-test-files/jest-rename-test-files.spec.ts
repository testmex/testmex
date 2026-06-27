import { describe, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { jestRenameTestFilesTransform } from './jest-rename-test-files.transform';

describe(jestRenameTestFilesTransform, () => {
  it.todo('renames .spec.ts to .jest.ts', () => {
    // create workspace with apps/my-app/src/app.spec.ts
    // run jestRenameTestFilesTransform
    // assert apps/my-app/src/app.jest.ts exists with same content
    // assert apps/my-app/src/app.spec.ts no longer exists
  });

  it.todo('renames .test.ts to .jest.ts', () => {
    // create workspace with apps/my-app/src/app.test.ts
    // run jestRenameTestFilesTransform
    // assert apps/my-app/src/app.jest.ts exists with same content
    // assert apps/my-app/src/app.test.ts no longer exists
  });

  it.todo('skips files that are not .spec.ts or .test.ts', () => {
    // create workspace with apps/my-app/src/app.ts
    // run jestRenameTestFilesTransform
    // assert apps/my-app/src/app.ts still exists
  });
});

async function transformTestFile({
  appName = 'my-app',
  fileName,
  content,
}: {
  appName?: string;
  fileName: string;
  content: string;
}) {
  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.testFile({
        appName,
        content,
        fileName,
      }).build(),
    ),
  );

  await runTransform({
    workspace,
    transforms: [jestRenameTestFilesTransform],
  });

  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/${fileName}`),
  );
}
