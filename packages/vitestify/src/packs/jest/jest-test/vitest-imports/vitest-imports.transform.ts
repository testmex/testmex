import { defineFileTransform } from '../../../../core/domain/define-file-transform';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { ensureVitestSymbol } from '../../../../infra/ast/vitest-ast-utils';
import { findingTypes } from '../../identifiers';
import { jestGlobals } from './jest-globals';

export const vitestImportsTransform = defineFileTransform({
  name: 'vitest-imports',
  findingType: findingTypes.vitestImportsNeeded,
  apply: (content) => {
    const editor = new SgEditor(content);

    for (const identifierUsage of jestGlobals
      .map((jestGlobal) => editor.root.find(jestGlobal))
      .filter((node) => node != null)) {
      const jestIdentifierText =
        identifierUsage.text() as (typeof jestGlobals)[number];
      ensureVitestSymbol({ editor, symbol: jestIdentifierText });
    }

    return editor.commit();
  },
});
