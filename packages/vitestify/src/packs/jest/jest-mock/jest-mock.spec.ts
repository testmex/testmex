import { describe, expect, it } from 'vitest';
import { jestSymbolHeuristic } from '../jest-symbol/jest-symbol-heuristic';
import { transformTestFile as runTransformTestFile } from '../testing';
import { jestMockTransform } from './jest-mock-transform';

describe('jestMock', () => {
  it('detects and rewrites `jest.mock` to `vi.mock` via the Tree', async () => {
    expect(await transformTestFile(`jest.mock('./foo');`)).toBe(
      `\
import { vi } from 'vitest';
vi.mock('./foo');`,
    );
  });

  it("adds `import { vi } from 'vitest'` when missing", async () => {
    expect(await transformTestFile(`jest.mock('./foo');`)).toContain(
      `import { vi } from 'vitest';`,
    );
  });

  it('does not add a duplicate `vi` import when already present', async () => {
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

function transformTestFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [jestSymbolHeuristic],
    transforms: [jestMockTransform],
  });
}
