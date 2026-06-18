import { Lang, parse } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { findingTypes } from '../identifiers';

export const jestMockTransform = defineFileTransform({
  findingType: findingTypes.jestMockCall,
  apply: _rewriteJestMock,
});

function _rewriteJestMock(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const mockNodes = root.findAll('jest.mock($$$ARGS)');

  if (mockNodes.length === 0) {
    return content;
  }

  const hasBlockBodyFactory = mockNodes.some((node) =>
    /\(\s*\)\s*=>\s*\{/.test(node.text()),
  );

  const edits = mockNodes.map((node) =>
    node.replace(_rewriteMockCallText(node.text())),
  );

  if (!_hasViImport(root)) {
    const insertPos = _getImportInsertPosition(content);
    const importText = hasBlockBodyFactory
      ? "import { vi } from 'vitest';\n\n"
      : "import { vi } from 'vitest';\n";

    edits.unshift({
      startPos: insertPos,
      endPos: insertPos,
      insertedText: importText,
    });
  }

  return root.commitEdits(edits);
}

function _rewriteMockCallText(text: string): string {
  let result = text.replace(/\bjest\.mock\b/, 'vi.mock');

  if (/\bjest\.requireActual\b/.test(result)) {
    result = result.replace(
      /(\bvi\.mock\s*\(\s*[^,]+,\s*)(?!async\b)/,
      '$1async ',
    );
    result = result.replace(
      /\.\.\.\s*jest\.requireActual\s*\(([^)]*)\)/g,
      '...(await vi.importActual($1))',
    );
    result = result.replace(
      /\bjest\.requireActual\s*\(([^)]*)\)/g,
      'await vi.importActual($1)',
    );
  }

  return result.replace(/\bjest\.fn\b/g, 'vi.fn');
}

function _getImportInsertPosition(content: string): number {
  const leadingCommentPattern =
    /^(\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*\n|\s)+)/;

  const match = leadingCommentPattern.exec(content);

  return match?.[1].length ?? 0;
}

function _hasViImport(root: ReturnType<ReturnType<typeof parse>['root']>) {
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
