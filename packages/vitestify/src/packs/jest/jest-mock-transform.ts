import { Lang, parse } from '@ast-grep/napi';
import type { Transform } from '../../core/models/transform';
import { findingTypes } from './identifiers';

export const jestMockTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.jestMockCall ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _rewriteJestMock(content));
      }
    }
  },
};

function _rewriteJestMock(content: string): string {
  const root = parse(Lang.TypeScript, content).root();
  const nodes = root.findAll('jest.mock($$$ARGS)');

  if (nodes.length === 0) {
    return content;
  }

  const edits = nodes.map((node) => {
    const args = node
      .getMultipleMatches('ARGS')
      .map((arg) => arg.text())
      .join('');

    return node.replace(`vi.mock(${args})`);
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
