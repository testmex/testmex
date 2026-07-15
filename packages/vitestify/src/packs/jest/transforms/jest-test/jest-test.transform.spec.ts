import { describe, expect, it } from 'vitest';
import { Analyzer } from '../../../../pipeline/analyzer';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { relativePath } from '../../../../core/models/relative-path';
import { CommandRunnerFake } from '../../../../core/ports/command-runner.fake';
import { runTransform } from '../../../../testing/run-transform';
import { fileTags } from '../../../core/identifiers';
import { jestSymbolHeuristic } from '../../heuristics/jest-symbol/jest-symbol.heuristic';
import { jestFocusSkipShorthandHeuristic } from '../../heuristics/jest-focus-skip-shorthand/jest-focus-skip-shorthand.heuristic';
import { vitestImportsNeededHeuristic } from '../../heuristics/vitest-imports-needed/vitest-imports-needed.heuristic';
import { jestTestTransform } from './jest-test.transform';

const _heuristics = [
  jestSymbolHeuristic,
  jestFocusSkipShorthandHeuristic,
  vitestImportsNeededHeuristic,
];

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

  it(
    'verify returns VerifyResult with rollback on failure',
    async () => {
      const appName = 'my-app';
      const commandRunner = new CommandRunnerFake();
      const workspace = createTestingWorkspace(
        WorkspaceMother.withApp(appName)
          .withFile(
            WorkspaceFileMother.testFile({
              appName,
              content: "jest.mock('./foo');",
              fileName: 'src/foo.spec.ts',
            }).build(),
          )
          .withFile(
            WorkspaceFileMother.testFile({
              appName,
              content: "jest.mock('./bar');",
              fileName: 'src/bar.spec.ts',
            }).build(),
          ),
      );

      await new Analyzer({ heuristics: _heuristics }).analyze(workspace);

      const fooPath = relativePath(`apps/${appName}/src/foo.spec.ts`);
      const barPath = relativePath(`apps/${appName}/src/bar.spec.ts`);

      commandRunner.configure({
        [`npx vitest run --reporter=json ${fooPath} ${barPath}`]: {
          output: JSON.stringify({
            testResults: [
              { name: fooPath, status: 'failed' },
              { name: barPath, status: 'passed' },
            ],
          }),
        },
      });

      const result = await jestTestTransform.apply(workspace, {
        commandRunner,
      });
      const verifyResult = await result?.verify();

      expect(verifyResult?.rollback).toBeDefined();
    },
  );

  it.todo('rollback reverts only failed files', () => {
    // Arrange `VerifyResult` from jest-test verify with one failing file renamed `.jest.cts` → `.spec.ts`.
    // Call `result.rollback()`.
    // Assert failed file is renamed back to `.jest.cts` with original Jest content restored.
    // Assert passing file remains `.spec.ts` with Vitest content.
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
      jestFocusSkipShorthandHeuristic,
      vitestImportsNeededHeuristic,
    ],
    transforms: [jestTestTransform],
  });

  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/${filePath}`),
  );
}
