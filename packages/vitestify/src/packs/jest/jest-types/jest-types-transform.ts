import { Lang, parse } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { findingTypes } from '../identifiers';

const jestTypeReplacements = [
  { regex: '^jest\\.MockedFunction$', replacement: 'MockedFunction' },
  { regex: '^jest\\.MockedFn$', replacement: 'MockedFunction' },
  { regex: '^jest\\.Mock$', replacement: 'Mock' },
] as const;

export const jestTypesTransform = defineFileTransform({
  findingType: findingTypes.jestSymbol,
  apply: _rewriteJestTypes,
});

function _rewriteJestTypes(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const edits = jestTypeReplacements.flatMap(({ regex, replacement }) =>
    root
      .findAll({
        rule: { kind: 'nested_type_identifier', regex },
      })
      .map((node) => node.replace(replacement)),
  );

  if (edits.length === 0) {
    return content;
  }

  const needsMock = /\bjest\.Mock\b/.test(content);
  const needsMockedFunction = /\bjest\.(MockedFunction|MockedFn)\b/.test(content);

  if (needsMockedFunction && !_hasTypeImport(root, 'MockedFunction')) {
    edits.unshift({
      startPos: 0,
      endPos: 0,
      insertedText: "import type { MockedFunction } from 'vitest';\n",
    });
  }

  if (needsMock && !_hasTypeImport(root, 'Mock')) {
    edits.unshift({
      startPos: 0,
      endPos: 0,
      insertedText: "import type { Mock } from 'vitest';\n",
    });
  }

  return root.commitEdits(edits);
}

function _hasTypeImport(
  root: ReturnType<ReturnType<typeof parse>['root']>,
  typeName: string,
) {
  for (const imp of root.findAll('import type { $$$NAMES } from $SOURCE')) {
    if (
      imp
        .getMatch('SOURCE')
        ?.find({ rule: { kind: 'string_fragment' } })
        ?.text() !== 'vitest'
    ) {
      continue;
    }

    for (const name of imp.getMultipleMatches('NAMES')) {
      if (name.text().trim() === typeName) {
        return true;
      }
    }
  }

  return false;
}
