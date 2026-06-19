import { SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { noIntermediateOfKind } from '../../../infra/ast/ast-utils';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';
import { ensureVitestSymbol } from '../../../infra/ast/vitest-ast-utils';

export const jestMockTransform = defineFileTransform({
  findingType: findingTypes.jestSymbol,
  apply: _rewriteDefaultExportMocks,
});

function _rewriteDefaultExportMocks(content: string): string {
  const editor = new SgEditor(content);
  const mockCalls = [
    ...editor.root.findAll('jest.mock($MODULE)'),
    ...editor.root.findAll('jest.mock($MODULE, () => $BODY)'),
  ];

  for (const jestMockCall of mockCalls) {
    const body = jestMockCall.getMatch('BODY');
    const bodyTxt = body?.text();
    const moduleTxt = jestMockCall.getMatch('MODULE')?.text();
    if (moduleTxt == null) {
      continue;
    }

    /* jest.mock(…) without body. */
    if (body == null || bodyTxt == null) {
      const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
      editor.replaceNode(jestMockCall, `${vi}.mock(${moduleTxt})`);
    } else {
      /* jest.mock(…, () => { … }) */
      if (body.kind() === 'statement_block') {
        _rewriteReturnStatements({ body, jestMockCall, editor });
      } else if (!_objectExpressionHasDefaultProperty(body)) {
        /* jest.mock(…, () => (…)) */
        _rewriteInlineArrow({ jestMockCall, editor, moduleTxt, bodyTxt });
      }
    }
  }

  return editor.commit();
}

function _rewriteReturnStatements({
  body,
  jestMockCall,
  editor,
}: {
  body: SgNode;
  jestMockCall: SgNode;
  editor: SgEditor;
}): void {
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
  _rewriteJestCalleeToVi({ jestMockCall, editor });
}

function _rewriteInlineArrow({
  jestMockCall,
  editor,
  moduleTxt,
  bodyTxt,
}: {
  jestMockCall: SgNode;
  editor: SgEditor;
  moduleTxt: string;
  bodyTxt: string;
}): void {
  const vi = ensureVitestSymbol({ editor, symbol: 'vi' });
  /* jest.mock(…, () => (…)) */
  editor.replaceNode(
    jestMockCall,
    `${vi}.mock(${moduleTxt}, () => ({ default: ${bodyTxt} }))`,
  );
}

function _rewriteJestCalleeToVi({
  jestMockCall,
  editor,
}: {
  jestMockCall: SgNode;
  editor: SgEditor;
}): void {
  const callee = jestMockCall.child(0);
  if (callee?.kind() !== 'member_expression') {
    return;
  }

  const jestId = callee.child(0);
  if (jestId?.text() === 'jest') {
    editor.replaceNode(jestId, ensureVitestSymbol({ editor, symbol: 'vi' }));
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
