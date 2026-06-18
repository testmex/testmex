import { describe, expect, it } from 'vitest';
import {
  createTestingWorkspace,
  workspaceMother,
} from '../../../core/models/workspace.mother';
import { runTransform } from '../../../testing/run-transform';
import { snapHeuristic } from './snap-heuristic';
import { snapTransform } from './snap-transform';

describe('snap', () => {
  it(
    'normalize jest snapshot file format in __snapshots__/*.snap',
    async () => {
      const { transformSnapFile } = setUp();

      expect(
        await transformSnapFile(`\
exports[\`foo test 1\`] = \`
Array [
  "foo",
  "bar",
]
\`;

exports[\`bar test 1\`] = \`
Object {
  "key": "value",
}
\`;`),
      ).toBe(`\
exports[\`foo test 1\`] = \`
[
  "foo",
  "bar",
]
\`;

exports[\`bar test 1\`] = \`
{
  "key": "value",
}
\`;`);
    },
  );

  it('rewrites `Array [` to `[` via string replace', async () => {
    const { transformSnapFile } = setUp();

    expect(
      await transformSnapFile(`\
exports[\`foo test 1\`] = \`
Array [
  "foo",
  "bar",
]
\`;`),
    ).toBe(`\
exports[\`foo test 1\`] = \`
[
  "foo",
  "bar",
]
\`;`);
  });

  it('rewrites `Object {` to `{` via string replace', async () => {
    const { transformSnapFile } = setUp();

    expect(
      await transformSnapFile(`\
exports[\`bar test 1\`] = \`
Object {
  "key": "value",
}
\`;`),
    ).toBe(`\
exports[\`bar test 1\`] = \`
{
  "key": "value",
}
\`;`);
  });

  it('targets .snap files in __snapshots__, not .spec.ts', async () => {
    const { transformSpecFile } = setUp();
    const specContent = `\
const snapshot = \`
Array [
  "foo",
]
\`;

const objectSnapshot = \`
Object {
  "key": "value",
}
\`;`;

    expect(await transformSpecFile(specContent)).toBe(specContent);
  });
});

function setUp() {
  return {
    transformSnapFile: async (content: string) => {
      const workspace = createTestingWorkspace(
        workspaceMother
          .withApp('my-app')
          .withAppFile(
            'my-app',
            'src/__snapshots__/app.spec.ts.snap',
            content,
          ),
      );
      await runTransform({
        workspace,
        heuristics: [snapHeuristic],
        transforms: [snapTransform],
      });
      const file = workspace.info.projects[0].files.find((f) =>
        f.path.endsWith('.snap'),
      );
      return await workspace.tree.maybeReadFile(file!.path);
    },
    transformSpecFile: async (content: string) => {
      const workspace = createTestingWorkspace(
        workspaceMother
          .withApp('my-app')
          .withAppFile('my-app', 'src/app.spec.ts', content),
      );
      await runTransform({
        workspace,
        heuristics: [snapHeuristic],
        transforms: [snapTransform],
      });
      const file = workspace.info.projects[0].files.find((f) =>
        f.path.endsWith('.spec.ts'),
      );
      return await workspace.tree.maybeReadFile(file!.path);
    },
  };
}

export { setUp };
