import { SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { noIntermediateOfKind } from '../../../infra/ast/ast-utils';
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
          noIntermediateOfKind(returnStmt, body, [
            'arrow_function',
            'function_expression',
            'function_declaration',
          ]) &&
          !_objectExpressionHasDefaultProperty(returnStmt)
        ) {
          editor.replaceNode(returnStmt, `return { default: ${returnTxt} };`);
        }
      }
      _rewriteJestCalleeToVi(call, editor);
    } else if (!_objectExpressionHasDefaultProperty(body)) {
      /* jest.mock(…, () => (…)) */
      editor.replaceNode(
        call,
        `vi.${methodTxt}(${moduleTxt}, () => ({ default: ${bodyTxt} }))`,
      );
    }
  }

  return editor.commit();
}

function _rewriteJestCalleeToVi(call: SgNode, editor: SgEditor): void {
  const callee = call.child(0);
  if (callee?.kind() !== 'member_expression') {
    return;
  }

  const jestId = callee.child(0);
  if (jestId?.text() === 'jest') {
    editor.replaceNode(jestId, 'vi');
  }
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
    return noIntermediateOfKind(property, objectExpression, ['object']);
  });
}
