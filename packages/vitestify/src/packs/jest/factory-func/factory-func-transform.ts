import { Lang, parse } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { findingTypes } from '../identifiers';

export const factoryFuncTransform = defineFileTransform({
  findingType: findingTypes.factoryFuncSetMock,
  apply: _wrapSetMockObjectLiteral,
});

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
