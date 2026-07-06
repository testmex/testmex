import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags } from '../../core/identifiers';
import { findJestConfig } from '../jest-ast-utils';

export const configTestPathPatternsTransform = defineFileTransform({
  name: 'config-test-path-patterns',
  fileTags: [fileTags.jestConfig],
  apply: (content) => {
    const editor = new SgEditor(content);

    const config = findJestConfig(editor.root);

    const testPathPatternsPair = config?.testPathPatterns;

    /* `testPathPatterns` option exists. */
    if (testPathPatternsPair) {
      const patterns =
        testPathPatternsPair
          .find('[$$$PATTERNS]')
          ?.getMultipleMatches('PATTERNS') ?? [];

      for (const pattern of patterns) {
        let newPattern = pattern
          .text()
          .replaceAll(/(?<=\b)(spec|test)(?=\b)/g, 'jest');

        /* The previous transform tends to replace `spec|test` with `jest|jest`
         * which is fine but feels weird. Let's normalize. */
        const doubleJest = 'jest|jest';
        while (newPattern.includes(doubleJest)) {
          newPattern = newPattern.replaceAll(doubleJest, 'jest');
        }

        newPattern = newPattern.replaceAll('(ts|tsx)', '(cts|tsx)');

        editor.replaceNode(pattern, newPattern);
      }
    } else {
      /* `testPathPatterns` option is not present (probably because it's in a preset). */
      const lastPair = Object.values(config ?? {}).at(-1);

      if (lastPair) {
        editor.replaceNode(
          lastPair,
          `${lastPair.text()},
  testPathPatterns: ["**/.*\\\\.jest\\\\.(cts|tsx)"]`,
        );
      }
    }

    return editor.commit();
  },
});
