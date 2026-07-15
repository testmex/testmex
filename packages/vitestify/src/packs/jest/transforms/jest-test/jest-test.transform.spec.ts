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

  it('rollback reverts only failed files', async () => {
    const appName = 'my-app';
    const commandRunner = new CommandRunnerFake();
    const workspace = createTestingWorkspace(
      WorkspaceMother.withApp(appName)
        .withFile(
          WorkspaceFileMother.testFile({
            appName,
            content: "jest.mock('./foo');",
            fileName: 'src/foo.jest.cts',
          }).build(),
        )
        .withFile(
          WorkspaceFileMother.testFile({
            appName,
            content: "jest.mock('./bar');",
            fileName: 'src/bar.jest.cts',
          }).build(),
        ),
    );

    await new Analyzer({ heuristics: _heuristics }).analyze(workspace);

    const fooSpecPath = relativePath(`apps/${appName}/src/foo.spec.ts`);
    const barSpecPath = relativePath(`apps/${appName}/src/bar.spec.ts`);
    const fooJestPath = relativePath(`apps/${appName}/src/foo.jest.cts`);

    commandRunner.configure({
      [`npx vitest run --reporter=json ${fooSpecPath} ${barSpecPath}`]: {
        output: JSON.stringify({
          testResults: [
            { name: fooSpecPath, status: 'failed' },
            { name: barSpecPath, status: 'passed' },
          ],
        }),
      },
    });

    const result = await jestTestTransform.apply(workspace, {
      commandRunner,
    });
    await workspace.tree.commit();

    const barMigratedContent = await workspace.tree.maybeReadFile(
      barSpecPath,
    );

    const verifyResult = await result?.verify();
    await verifyResult?.rollback();

    expect(await workspace.tree.maybeReadFile(fooSpecPath)).toBeNull();
    expect(await workspace.tree.maybeReadFile(fooJestPath)).toContain(
      "jest.mock('./foo');",
    );
    expect(await workspace.tree.maybeReadFile(barSpecPath)).toBe(
      barMigratedContent,
    );
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
