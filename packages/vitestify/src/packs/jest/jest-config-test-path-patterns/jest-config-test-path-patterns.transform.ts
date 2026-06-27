import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { findingTypes } from '../identifiers';

/**
 * @deprecated 🚧 Work in progress.
 */
export const jestConfigTestPathPatterns = defineFileTransform({
  name: 'jest-config-test-path-patterns',
  findingType: findingTypes.jestConfig,
  apply: (content) => {
    const editor = new SgEditor(content);

    const configPairs = editor.root
      .find('module.exports = $CONFIG')
      ?.getMatch('CONFIG')
      ?.children()
      ?.filter((c) => c.kind() === 'pair');

    const testPathPatternsPair = configPairs?.find(
      (pair) => pair.child(0)?.text() === 'testPathPatterns',
    );

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

        editor.replaceNode(pattern, newPattern);
      }
    } else {
      /* `testPathPatterns` option is not present (probably because it's in a preset). */
      const lastPair = configPairs?.at(-1);

      if (lastPair) {
        editor.replaceNode(
          lastPair,
          `${lastPair.text()},
  testPathPatterns: ["**/.*\\.jest\\.(ts|tsx)"]`,
        );
      }
    }

    return editor.commit();
  },
});
