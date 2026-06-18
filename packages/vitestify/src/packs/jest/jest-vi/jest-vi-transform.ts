import { Lang, parse, type SgNode } from '@ast-grep/napi';
import type { Transform } from '../../../core/models/transform';
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

export const jestViTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.jestViCall ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _rewriteJestVi(content));
      }
    }
  },
};

function _rewriteJestVi(content: string): string {
  if (/\bjest\.enableAutomock\s*\(/.test(content)) {
    throw new Error(
      'The automocking API "enableAutomock" is not supported in vitest.\nSee https://vitest.dev/guide/migration.html',
    );
  }

  let result = content;

  for (let pass = 0; pass < 256; pass++) {
    const root = parse(Lang.TypeScript, result).root();
    const disableAutomock = root.find('jest.disableAutomock($$$ARGS)');

    if (disableAutomock) {
      const statement = _expressionStatement(disableAutomock);
      result = root.commitEdits([
        {
          startPos: statement.range().start.index,
          endPos: statement.range().end.index,
          insertedText: '',
        },
      ]);
      continue;
    }

    const calls = _collectJestCalls(root);
    if (calls.length === 0) {
      break;
    }

    const { call, method } = calls[0];
    const edits: Array<
      | ReturnType<SgNode['replace']>
      | { startPos: number; endPos: number; insertedText: string }
    > = [];

    if (method === 'spyOn' && call.text().includes('global')) {
      const argMatch = call.text().match(/jest\.spyOn\(global,\s*(.+)\)$/);
      const arg = argMatch?.[1] ?? '';
      edits.push(call.replace(`vi.spyOn(globalThis, ${arg})`));
    } else {
      const viMethod = apiNamesRecord[method] ?? method;
      const replacement = _replaceJestCall(call.text(), method, viMethod);

      if (apiNamesToMakeAsync.has(method)) {
        const inSpread = call.parent()?.kind() === 'spread_element';
        const awaited = inSpread
          ? `(await ${replacement})`
          : `await ${replacement}`;
        edits.push(call.replace(awaited));
        _markEnclosingFunctionAsync(call, edits);
      } else {
        edits.push(call.replace(replacement));
      }
    }

    result = root.commitEdits(edits);
  }

  if (genericAsyncApiPattern.test(result)) {
    result = result.replace(
      genericAsyncApiPattern,
      (_match, _method, typeParams = '') => `await vi.importMock${typeParams}(`,
    );
  }

  if (/\bvi\.\w+/.test(result) && !_hasViImport(parse(Lang.TypeScript, result).root())) {
    result = `import { vi } from 'vitest';\n${result}`;
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

function _markEnclosingFunctionAsync(
  node: SgNode,
  edits: Array<
    | ReturnType<SgNode['replace']>
    | { startPos: number; endPos: number; insertedText: string }
  >,
): void {
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

  edits.push({
    startPos: params.range().start.index,
    endPos: params.range().start.index,
    insertedText: 'async ',
  });
}

function _hasViImport(root: SgNode) {
  for (const imp of root.findAll('import { $$$NAMES } from $SOURCE')) {
    if (
      imp
        .getMatch('SOURCE')
        ?.find({ rule: { kind: 'string_fragment' } })
        ?.text() !== 'vitest'
    ) {
      continue;
    }

    for (const name of imp.getMultipleMatches('NAMES')) {
      if (name.text().trim() === 'vi') {
        return true;
      }
    }
  }

  return false;
}
