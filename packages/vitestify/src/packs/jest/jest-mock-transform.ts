import { Lang, parse } from '@ast-grep/napi';
import type { Transform } from '../../core/models/transform';
import { findingTypes } from './findings';

export const jestMockTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.jestMockCall ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _rewriteJestMock(content));
      }
    }
  },
};

function _rewriteJestMock(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const nodes = root.findAll('jest.mock($$$ARGS)');

  if (nodes.length === 0) {
    return content;
  }

  const edits = nodes.map((node) => {
    const args = node
      .getMultipleMatches('ARGS')
      .map((arg) => arg.text())
      .join('');

    return node.replace(`vi.mock(${args})`);
  });

  return root.commitEdits(edits);
}
