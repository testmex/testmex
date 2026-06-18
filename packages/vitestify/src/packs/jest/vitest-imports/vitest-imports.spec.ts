import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { vitestImportsHeuristic } from './vitest-imports-heuristic';
import { vitestImportsTransform } from './vitest-imports-transform';

describe('vitestImports', () => {
  it('adds named imports from vitest for globals used in a file', async () => {
    const { transformTestFile } = setUp();

    expect(
      await transformTestFile(`\
describe(OrpiDirectoriesController.name, () => {
  it('should sync agency successfully and return 204', async () => {
    expect(true).toBe(true);
  });
});`),
    ).toBe(`\
import { describe, it, expect } from 'vitest';

describe(OrpiDirectoriesController.name, () => {
  it('should sync agency successfully and return 204', async () => {
    expect(true).toBe(true);
  });
});`);
  });

  it(
    'adds imports for describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, and vi',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`\
describe('suite', () => {
  beforeAll(() => {});
  afterAll(() => {});
  beforeEach(() => {});
  afterEach(() => {});

  it('uses it', () => {
    expect(true).toBe(true);
  });

  test('uses test', () => {
    vi.fn();
  });
});`),
      ).toBe(`\
import { describe, it, test, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

describe('suite', () => {
  beforeAll(() => {});
  afterAll(() => {});
  beforeEach(() => {});
  afterEach(() => {});

  it('uses it', () => {
    expect(true).toBe(true);
  });

  test('uses test', () => {
    vi.fn();
  });
});`);
    },
  );

  it('does not rewrite it.todo or test.todo (imports it/test only)', async () => {
    const { transformTestFile } = setUp();

    expect(
      await transformTestFile(`\
it.todo('implement later');
test.todo('also later');`),
    ).toBe(`\
import { it, test } from 'vitest';

it.todo('implement later');
test.todo('also later');`);
  });

  it(
    'does not rewrite it.concurrent or test.concurrent (imports it/test only)',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`\
it.concurrent('runs in parallel', async () => { /* … */ });
test.concurrent('also parallel', async () => { /* … */ });`),
      ).toBe(`\
import { it, test } from 'vitest';

it.concurrent('runs in parallel', async () => { /* … */ });
test.concurrent('also parallel', async () => { /* … */ });`);
    },
  );

  it(
    'does not rewrite describe.only, describe.skip, or describe.each (imports describe only)',
    async () => {
      const { transformTestFile } = setUp();

      expect(
        await transformTestFile(`\
const cases = [1, 2];

describe.skip('legacy suite', () => { /* … */ });
describe.only('focused suite', () => { /* … */ });
describe.each(cases)('case %s', (input) => { /* … */ });`),
      ).toBe(`\
import { describe } from 'vitest';

const cases = [1, 2];

describe.skip('legacy suite', () => { /* … */ });
describe.only('focused suite', () => { /* … */ });
describe.each(cases)('case %s', (input) => { /* … */ });`);
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
        heuristics: [vitestImportsHeuristic],
        transforms: [vitestImportsTransform],
      });
      const file = workspace.info.projects[0].files[0];
      return await workspace.tree.maybeReadFile(file.path);
    },
  };
}
