import { Lang, parse, type SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { findingTypes } from '../identifiers';

export const defaultExportsTransform = defineFileTransform({
  findingType: findingTypes.defaultExportMockFactory,
  apply: _rewriteDefaultExportMocks,
});

function _rewriteDefaultExportMocks(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const mockCalls = [
    ...root.findAll('jest.mock($$$ARGS)'),
    ...root.findAll('jest.setMock($$$ARGS)'),
  ];

  if (mockCalls.length === 0) {
    return content;
  }

  const edits = [];

  for (const call of mockCalls) {
    const edit = _rewriteMockCall(call);

    if (edit != null) {
      edits.push(edit);
    }
  }

  if (edits.length === 0) {
    return content;
  }

  return root.commitEdits(edits);
}

function _rewriteMockCall(
  call: SgNode,
): { startPos: number; endPos: number; insertedText: string } | null {
  const argsNode = call.field('arguments');
  const args =
    argsNode
      ?.children()
      .filter(
        (child) =>
          child.kind() !== '(' && child.kind() !== ')' && child.kind() !== ',',
      ) ?? [];

  if (args.length < 2) {
    return null;
  }

  const factory = args[1];

  if (
    factory.kind() !== 'arrow_function' &&
    factory.kind() !== 'function_expression'
  ) {
    return null;
  }

  if (factory.kind() === 'arrow_function') {
    const body = factory.field('body');

    if (body == null) {
      return null;
    }

    if (body.kind() === 'statement_block') {
      return _rewriteBlockFactory(factory);
    }

    if (_mockReturnAlreadyHasDefault(body)) {
      return null;
    }

    const params = factory.field('parameters')?.text() ?? '()';

    return factory.replace(`${params} => ({ default: ${body.text()} })`);
  }

  return _rewriteBlockFactory(factory);
}

function _rewriteBlockFactory(
  factory: SgNode,
): { startPos: number; endPos: number; insertedText: string } | null {
  const body = factory.field('body');

  if (body == null || body.kind() !== 'statement_block') {
    return null;
  }

  const returnStatement = body
    .children()
    .filter((child) => child.kind() === 'return_statement')
    .at(-1);

  if (returnStatement == null) {
    return null;
  }

  const returnValue = returnStatement
    .children()
    .find((child) => child.kind() !== 'return' && child.kind() !== ';');

  if (returnValue == null) {
    return null;
  }

  if (_objectExpressionHasDefaultProperty(returnValue)) {
    return null;
  }

  return returnValue.replace(`{ default: ${returnValue.text()} }`);
}

function _unwrapParentheses(node: SgNode): SgNode {
  if (node.kind() !== 'parenthesized_expression') {
    return node;
  }

  const inner = node
    .children()
    .find((child) => child.kind() !== '(' && child.kind() !== ')');

  return inner == null ? node : _unwrapParentheses(inner);
}

function _mockReturnAlreadyHasDefault(node: SgNode): boolean {
  return _objectExpressionHasDefaultProperty(_unwrapParentheses(node));
}

function _objectExpressionHasDefaultProperty(node: SgNode): boolean {
  if (node.kind() !== 'object') {
    return false;
  }

  for (const property of node.findAll({ rule: { kind: 'pair' } })) {
    const key = property.field('key');

    if (key?.text() === 'default') {
      return true;
    }
  }

  return false;
}
