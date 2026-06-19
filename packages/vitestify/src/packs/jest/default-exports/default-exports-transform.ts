import { SgNode } from '@ast-grep/napi';
import { Kinds, TypesMap } from '@ast-grep/napi/types/staticTypes';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';

export const defaultExportsTransform = defineFileTransform({
  findingType: findingTypes.defaultExportMockFactory,
  apply: _rewriteDefaultExportMocks,
});

function _rewriteDefaultExportMocks(content: string): string {
  const editor = new SgEditor(content);
  const mockCalls = editor.root.findAll(
    'jest.$MOCK_METHOD($MODULE, () => $BODY)',
  );

  for (const call of mockCalls) {
    const body = call.getMatch('BODY');
    const bodyTxt = body?.text();
    const methodTxt = call.getMatch('MOCK_METHOD')?.text();
    const moduleTxt = call.getMatch('MODULE')?.text();
    if (
      body == null ||
      bodyTxt == null ||
      methodTxt == null ||
      moduleTxt == null ||
      !['mock', 'setMock'].includes(methodTxt)
    ) {
      continue;
    }

    /* jest.mock(…, () => { … }) */
    if (body.kind() === 'statement_block') {
      for (const returnStmt of body.findAll('return $RETURN')) {
        const returnTxt = returnStmt.getMatch('RETURN')?.text();
        if (
          returnTxt != null &&
          _noIntermediateOfKind(returnStmt, body, [
            'arrow_function',
            'function_expression',
            'function_declaration',
          ]) &&
          !_objectExpressionHasDefaultProperty(returnStmt)
        ) {
          editor.replaceNode(returnStmt, `return { default: ${returnTxt} };`);
        }
      }
    } else if (!_objectExpressionHasDefaultProperty(body)) {
      /* jest.mock(…, () => (…)) */
      editor.replaceNode(
        call,
        `jest.${methodTxt}(${moduleTxt}, () => ({ default: ${bodyTxt} }))`,
      );
    }
  }

  return editor.commit();
}

/**
 * Checks if a return statement is in the scope of a block,
 * or in an a nested function.
 */
function _noIntermediateOfKind(
  node: SgNode,
  parent: SgNode,
  kinds: Kinds<TypesMap>[],
): boolean {
  let current: SgNode | null = node;

  while (current != null) {
    if (_isSameNode(current, parent)) {
      return true;
    }

    const kind = current.kind();

    if (kinds.includes(kind)) {
      return false;
    }

    current = current.parent();
  }

  return false;
}

function _isSameNode(node1: SgNode, node2?: SgNode | null): boolean {
  return (
    node1.range().start.index === node2?.range().start.index &&
    node1.range().end.index === node2?.range().end.index
  );
}

function _objectExpressionHasDefaultProperty(node: SgNode): boolean {
  if (
    node.kind() !== 'return_statement' &&
    node.kind() !== 'parenthesized_expression'
  ) {
    return false;
  }
  const objectExpression = node.child(1);
  if (objectExpression == null || objectExpression.kind() !== 'object') {
    return false;
  }

  return [
    ...node.findAll('{default: $DEFAULT}'),
    ...node.findAll('{default: $DEFAULT, $$$REST}'),
  ].some((property) => {
    return _noIntermediateOfKind(property, objectExpression, ['object']);
  });
}
