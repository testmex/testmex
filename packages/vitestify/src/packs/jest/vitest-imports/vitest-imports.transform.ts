import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';
import {
  _collectUsedVitestGlobals,
  vitestGlobals,
} from './vitest-imports.heuristic';

export const vitestImportsTransform = defineFileTransform({
  findingType: findingTypes.vitestImportsNeeded,
  apply: _rewriteVitestImports,
});

function _rewriteVitestImports(content: string): string {
  const usedGlobals = _collectUsedVitestGlobals(content);

  if (usedGlobals.length === 0) {
    return content;
  }

  const editor = new SgEditor(content);
  const importNames = _formatVitestImportNames(usedGlobals);
  const importStatement = `import { ${importNames} } from 'vitest';`;
  const existingImport = editor.root.find("import { $$$NAMES } from 'vitest'");

  if (existingImport) {
    editor.replaceNode(existingImport, importStatement);
  } else {
    const firstStatement = editor.root
      .children()
      .find((child) => child.kind() !== 'comment');
    if (firstStatement) {
      editor.insertBefore(firstStatement, `${importStatement}\n\n`);
    }
  }

  return editor.commit().trimEnd();
}

function _formatVitestImportNames(
  usedGlobals: ReturnType<typeof _collectUsedVitestGlobals>,
): string {
  return vitestGlobals
    .filter((global) => usedGlobals.includes(global))
    .join(', ');
}
