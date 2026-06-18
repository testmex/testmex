import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { factoryFuncTransform } from './factory-func-transform';
import { runTransform } from '../../../testing/run-transform';

describe('factoryFunc', () => {
  it(
    'wraps bare object literal in arrow factory for jest.setMock',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`jest.setMock('./module', { foo: 'bar' });`),
      ).toBe(`jest.setMock('./module', () => ({ foo: 'bar' }));`);
    },
  );

  it(
    'does not wrap when jest.setMock already has a factory function',
    async () => {
      const { transformTestFile } = setUp();

      const input = `jest.setMock('./module', () => ({ foo: 'bar' }));`;

      expect(await transformTestFile(input)).toBe(input);
    },
  );

  it(
    'leaves jest.setMock → vi.mock rename to jest-vi step',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`jest.setMock('./module', { foo: 'bar' });`),
      ).toBe(`jest.setMock('./module', () => ({ foo: 'bar' }));`);
    },
  );
});

function setUp() {
  return {
    transformTestFile: async (content: string) => {
      const workspace = createTestingWorkspace(
        workspaceMother
          .withApp('my-app')
          .withAppFile('my-app', 'src/app.spec.ts', content),
      );
      await runTransform({
        workspace,
        heuristics: [jestSymbolHeuristic],
        transforms: [factoryFuncTransform],
      });
      const file = workspace.info.projects[0].files[0];
      return await workspace.tree.maybeReadFile(file.path);
    },
  };
}
