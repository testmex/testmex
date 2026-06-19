import { describe, expect, it } from 'vitest';
import { transformTestFile as runTransformTestFile } from '../testing';
import { snapHeuristic } from './snap.heuristic';
import { snapTransform } from './snap.transform';

describe('snap', () => {
  it(
    'normalize jest snapshot file format in __snapshots__/*.snap',
    async () => {
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

function transformSnapFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [snapHeuristic],
    transforms: [snapTransform],
    filePath: 'src/__snapshots__/app.spec.ts.snap',
  });
}

function transformSpecFile(content: string) {
  return runTransformTestFile(content, {
    heuristics: [snapHeuristic],
    transforms: [snapTransform],
  });
}
