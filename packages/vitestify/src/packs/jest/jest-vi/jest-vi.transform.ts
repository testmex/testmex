import { type SgNode } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../identifiers';

const apiNamesRecord: Record<string, string> = {
  createMockFromModule: 'importMock',
  deepUnmock: 'unmock',
  genMockFromModule: 'importMock',
  requireActual: 'importActual',
  requireMock: 'importMock',
  setMock: 'mock',
};

const apiNamesToMakeAsync = new Set([
  'createMockFromModule',
  'genMockFromModule',
  'requireActual',
  'requireMock',
]);

const genericAsyncApiPattern =
  /\bjest\.(createMockFromModule|genMockFromModule)(\s*<[^>]+>)?\s*\(/g;

export const jestViTransform = defineFileTransform({
  findingType: findingTypes.jestSymbol,
  apply: _rewriteJestVi,
});

function _rewriteJestVi(content: string): string {
  if (/\bjest\.enableAutomock\s*\(/.test(content)) {
    throw new Error(
      'The automocking API "enableAutomock" is not supported in vitest.\nSee https://vitest.dev/guide/migration.html',
    );
  }

  let result = content;

  for (let pass = 0; pass < 256; pass++) {
    const editor = new SgEditor(result);
    const disableAutomock = editor.root.find('jest.disableAutomock($$$ARGS)');

    if (disableAutomock) {
      const statement = _expressionStatement(disableAutomock);
      editor.replaceNode(statement, '');
      result = editor.commit();
      continue;
    }

    const calls = _collectJestCalls(editor.root);
    if (calls.length === 0) {
      break;
    }

    const { call, method } = calls[0];

    if (method === 'spyOn' && call.text().includes('global')) {
      const argMatch = call.text().match(/jest\.spyOn\(global,\s*(.+)\)$/);
      const arg = argMatch?.[1] ?? '';
      editor.replaceNode(call, `vi.spyOn(globalThis, ${arg})`);
    } else {
      const viMethod = apiNamesRecord[method] ?? method;
      const replacement = _replaceJestCall(call.text(), method, viMethod);

      if (apiNamesToMakeAsync.has(method)) {
        const inSpread = call.parent()?.kind() === 'spread_element';
        const awaited = inSpread
          ? `(await ${replacement})`
          : `await ${replacement}`;
        editor.replaceNode(call, awaited);
        _markEnclosingFunctionAsync(call, editor);
      } else {
        editor.replaceNode(call, replacement);
      }
    }

    result = editor.commit();
  }

  if (genericAsyncApiPattern.test(result)) {
    result = result.replace(
      genericAsyncApiPattern,
      (_match, _method, typeParams = '') => `await vi.importMock${typeParams}(`,
    );
  }

  if (/\bvi\.\w+/.test(result)) {
    const editor = new SgEditor(result);
    ensureVitestSymbol({ editor, symbol: 'vi' });
    result = editor.commit();
  }

  return result.replace(/^\n+/, '');
}

function _collectJestCalls(root: SgNode) {
  const calls: Array<{ call: SgNode; method: string }> = [];

  for (const member of root.findAll('jest.$METHOD')) {
    const method = member.getMatch('METHOD')?.text();
    if (method == null || method === 'disableAutomock' || method === 'enableAutomock') {
      continue;
    }

    const parent = member.parent();
    if (parent?.kind() !== 'call_expression') {
      continue;
    }

    const fn = parent.field('function');
    if (fn == null || !fn.text().startsWith(`jest.${method}`)) {
      continue;
    }

    calls.push({ call: parent, method });
  }

  return calls.sort(
    (a, b) => a.call.text().length - b.call.text().length,
  );
}

function _replaceJestCall(text: string, method: string, viMethod: string): string {
  return text.replace(`jest.${method}`, `vi.${viMethod}`);
}

function _expressionStatement(node: SgNode): SgNode {
  let current: SgNode | null = node;
  while (current != null && current.kind() !== 'expression_statement') {
    current = current.parent();
  }
  return current ?? node;
}

function _markEnclosingFunctionAsync(node: SgNode, editor: SgEditor): void {
  let current: SgNode | null = node.parent();
  while (
    current != null &&
    current.kind() !== 'arrow_function' &&
    current.kind() !== 'function_expression' &&
    current.kind() !== 'function_declaration'
  ) {
    current = current.parent();
  }

  if (current == null || current.field('async') != null) {
    return;
  }

  const params = current.field('parameters');
  if (params == null) {
    return;
  }

  editor.insertBefore(params, 'async ');
}
