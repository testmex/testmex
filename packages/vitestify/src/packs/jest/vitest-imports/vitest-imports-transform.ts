import { Lang, parse } from '@ast-grep/napi';
import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { findingTypes } from '../identifiers';
import {
  _collectUsedVitestGlobals,
  vitestGlobals,
} from './vitest-imports-heuristic';

export const vitestImportsTransform = defineFileTransform({
  findingType: findingTypes.vitestImportsNeeded,
  apply: _rewriteVitestImports,
});

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
