import { Lang, parse } from '@ast-grep/napi';
import type { Transform } from '../../../core/models/transform';
import { findingTypes } from '../identifiers';

export const jestSetTimeoutTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.jestSetTimeoutCall ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _rewriteJestSetTimeout(content));
      }
    }
  },
};

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
