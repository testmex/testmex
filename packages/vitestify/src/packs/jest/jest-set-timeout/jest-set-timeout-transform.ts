import { Lang, parse } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { findingTypes } from '../identifiers';

export const jestSetTimeoutTransform = defineFileTransform({
  findingType: findingTypes.jestSymbol,
  apply: _rewriteJestSetTimeout,
});

function _rewriteJestSetTimeout(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const nodes = root.findAll('jest.setTimeout($ARG)');

  if (nodes.length === 0) {
    return content;
  }

  const edits = nodes.map((node) => {
    const arg = node.getMatch('ARG')?.text() ?? '';

    return node.replace(`vi.setConfig({ testTimeout: ${arg} })`);
  });

  if (!_hasViImport(root)) {
    edits.unshift({
      startPos: 0,
      endPos: 0,
      insertedText: "import { vi } from 'vitest';\n",
    });
  }

  return root.commitEdits(edits);
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
