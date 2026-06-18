import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { jestMockTransform } from './jest-mock-transform';
import { runTransform } from '../../../testing/run-transform';

describe('jestMock', () => {
  it('detects and rewrites `jest.mock` to `vi.mock` via the Tree', async () => {
    const { transformTestFile } = setUp();

    expect(await transformTestFile(`jest.mock('./foo');`)).toBe(
      `\
import { vi } from 'vitest';
vi.mock('./foo');`,
    );
  });

  it("adds `import { vi } from 'vitest'` when missing", async () => {
    const { transformTestFile } = setUp();

    expect(await transformTestFile(`jest.mock('./foo');`)).toContain(
      `import { vi } from 'vitest';`,
    );
  });

  it('does not add a duplicate `vi` import when already present', async () => {
    const { transformTestFile } = setUp();

    expect(
      await transformTestFile(`\
import { vi } from 'vitest';
jest.mock('./foo');`),
    ).toBe(
      `\
import { vi } from 'vitest';
vi.mock('./foo');`,
    );
  });

  it(
    'rewrites partial mocks with jest.requireActual spread to async vi.importActual',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`\
jest.mock('@mynotary/crossplatform/orpi-directories/core', () => ({
  ...jest.requireActual('@mynotary/crossplatform/orpi-directories/core'),
  canSyncAgency: jest.fn().mockReturnValue(true),
  canSyncAgencyCode: jest.fn().mockReturnValue(true)
}));`),
      ).toBe(
        `\
import { vi } from 'vitest';
vi.mock('@mynotary/crossplatform/orpi-directories/core', async () => ({
  ...(await vi.importActual('@mynotary/crossplatform/orpi-directories/core')),
  canSyncAgency: vi.fn().mockReturnValue(true),
  canSyncAgencyCode: vi.fn().mockReturnValue(true)
}));`,
      );
    },
  );

  it(
    'keeps eslint-disable import/first above hoisted vi.mock calls',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`\
/* eslint-disable import/first */
jest.mock('@mynotary/crossplatform/shared/pdf-util', () => {
  return {
    cleanPdf: () => new Uint8Array(),
    isValidPdf: () => true
  };
});`),
      ).toBe(
        `\
/* eslint-disable import/first */
import { vi } from 'vitest';

vi.mock('@mynotary/crossplatform/shared/pdf-util', () => {
  return {
    cleanPdf: () => new Uint8Array(),
    isValidPdf: () => true
  };
});`,
      );
    },
  );

  it(
    'rewrites jest.mock with object-return factory to vi.mock without default-export wrapping',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`\
jest.mock('@mynotary/crossplatform/shared/pdf-util', () => {
  return {
    cleanPdf: () => new Uint8Array(),
    isValidPdf: () => true
  };
});`),
      ).toBe(
        `\
import { vi } from 'vitest';

vi.mock('@mynotary/crossplatform/shared/pdf-util', () => {
  return {
    cleanPdf: () => new Uint8Array(),
    isValidPdf: () => true
  };
});`,
      );
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
        transforms: [jestMockTransform],
      });
      const file = workspace.info.projects[0].files[0];
      return await workspace.tree.maybeReadFile(file.path);
    },
  };
}
