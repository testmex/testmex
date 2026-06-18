import { Lang, parse } from '@ast-grep/napi';
import type { Transform } from '../../../core/models/transform';
import { findingTypes } from '../identifiers';

export const factoryFuncTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.factoryFuncSetMock ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _wrapSetMockObjectLiteral(content));
      }
    }
  },
};

function _wrapSetMockObjectLiteral(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const nodes = root.findAll('jest.setMock($$$ARGS)');

  if (nodes.length === 0) {
    return content;
  }

  const edits = nodes.flatMap((node) => {
    const args = node
      .getMultipleMatches('ARGS')
      .filter((arg) => arg.kind() !== ',');

    if (args.length < 2 || args[1].kind() !== 'object') {
      return [];
    }

    const moduleArg = args[0].text();
    const objectLiteral = args[1].text();

    return [node.replace(`jest.setMock(${moduleArg}, () => (${objectLiteral}))`)];
  });

  if (edits.length === 0) {
    return content;
  }

  return root.commitEdits(edits);
}
