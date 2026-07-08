import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../core/models/workspace.mother';
import { relativePath } from '../../../core/models/relative-path';
import { runTransform } from '../../../testing/run-transform';
import { fileTags } from '../../core/identifiers';
import { jestSymbolHeuristic } from '../jest-symbol.heuristic';
import { replaceApiHeuristic } from './replace-api/replace-api.heuristic';
import { vitestImportsNeededHeuristic } from './vitest-imports/vitest-imports-needed.heuristic';
import { jestTestTransform } from './jest-test.transform';

describe('jest-test', () => {
  it('does not transform a test file tagged as jest setup', async () => {
    const content = `\
import { jest } from '@jest/globals';
jest.mock('./foo');
`;

    expect(await _transformSetupTestFile(content)).toBe(`\
import { jest } from '@jest/globals';
jest.mock('./foo');
`);
  });
});

async function _transformSetupTestFile(content: string) {
  const appName = 'my-app';
  const filePath = 'src/test-setup.ts';

  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.file({
        appName,
        content,
        fileName: filePath,
        tags: [fileTags.code, fileTags.jestSetup],
      }).build(),
    ),
  );

  await runTransform({
    workspace,
    heuristics: [
      jestSymbolHeuristic,
      replaceApiHeuristic,
      vitestImportsNeededHeuristic,
    ],
    transforms: [jestTestTransform],
  });

  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/${filePath}`),
  );
}
