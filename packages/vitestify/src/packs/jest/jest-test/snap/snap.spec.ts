import { describe, expect, it } from 'vitest';
import { transformTestFile as runTransformTestFile } from '../../testing';
import { snapTransform } from './snap.transform';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { runTransform } from '../../../../testing/run-transform';
import { relativePath } from '../../../../core/models/relative-path';

describe(snapTransform.name, () => {
  it('normalize jest snapshot file format in __snapshots__/*.snap', async () => {
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
  });

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

    const result = await runTransformTestFile(specContent, {
      transforms: [snapTransform],
      filePath: 'src/app.spec.ts',
    });

    expect(result).toBe(specContent);
  });
});

async function transformSnapFile(content: string) {
  const appName = 'my-app';

  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp(appName).withFile(
      WorkspaceFileMother.snapshotFile({
        appName,
        fileName: 'app.spec.ts.snap',
        content,
      }).build(),
    ),
  );
  await runTransform({
    workspace,
    transforms: [snapTransform],
  });
  return workspace.tree.maybeReadFile(
    relativePath(`apps/${appName}/__snapshots__/app.spec.ts.snap`),
  );
}
