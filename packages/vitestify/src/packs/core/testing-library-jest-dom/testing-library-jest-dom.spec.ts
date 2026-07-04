import { describe, expect, it } from 'vitest';
import { relativePath } from '../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { fileTags } from '../identifiers';
import { testingLibraryJestDomHeuristic } from './testing-library-jest-dom.heuristic';
import { testingLibraryJestDomTransform } from './testing-library-jest-dom.transform';

describe('testing-library-jest-dom', () => {
  it.todo(
    'rewrites @testing-library/jest-dom side-effect import in setup files',
    async () => {
      const workspace = createTestingWorkspace(
        WorkspaceMother.withApp('my-app').withFile(
          WorkspaceFileMother.file({
            appName: 'my-app',
            content: `import '@testing-library/jest-dom';`,
            fileName: 'jest.setup.ts',
            tags: [fileTags.code],
          }).build(),
        ),
      );

      await runTransform({
        workspace,
        heuristics: [testingLibraryJestDomHeuristic],
        transforms: [testingLibraryJestDomTransform],
      });

      expect(
        await workspace.tree.maybeReadFile(
          relativePath('apps/my-app/jest.setup.ts'),
        ),
      ).toBe(`\
if (!process.env.VITEST) {
  require('@testing-library/jest-dom')
}
`);
    },
  );
});
