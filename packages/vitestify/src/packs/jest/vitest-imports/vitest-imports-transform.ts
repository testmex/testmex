import { Lang, parse } from '@ast-grep/napi';
import type { Transform } from '../../../core/models/transform';
import { findingTypes } from '../identifiers';
import {
  _collectUsedVitestGlobals,
  vitestGlobals,
} from './vitest-imports-heuristic';

export const vitestImportsTransform: Transform = {
  apply: async ({ findings, workspace }): Promise<void> => {
    const { tree } = workspace;

    for (const finding of findings) {
      if (
        finding.type !== findingTypes.vitestImportsNeeded ||
        finding.file === undefined
      ) {
        continue;
      }

      const content = await tree.maybeReadFile(finding.file.path);

      if (content != null) {
        await tree.write(finding.file.path, _rewriteVitestImports(content));
      }
    }
  },
};

function _rewriteVitestImports(content: string): string {
  const usedGlobals = _collectUsedVitestGlobals(content);

  if (usedGlobals.length === 0) {
    return content;
  }

  const root = parse(Lang.TypeScript, content).root();
  const existingImport = root.find("import { $$$NAMES } from 'vitest'");
  const importNames = _formatVitestImportNames(usedGlobals);
  const importStatement = `import { ${importNames} } from 'vitest';`;

  if (existingImport) {
    return root
      .commitEdits([existingImport.replace(importStatement)])
      .trimEnd();
  }

  return `${importStatement}\n\n${content}`.trimEnd();
}

function _formatVitestImportNames(
  usedGlobals: ReturnType<typeof _collectUsedVitestGlobals>,
): string {
  return vitestGlobals
    .filter((global) => usedGlobals.includes(global))
    .join(', ');
}
