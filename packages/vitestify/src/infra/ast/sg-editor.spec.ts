import { describe, expect, it } from 'vitest';
import { SgEditor } from './sg-editor';

describe(SgEditor, () => {
  describe('insertAtTop', () => {
    it('inserts after a leading block comment', () => {
      const editor = new SgEditor(`\
/* license header */
// blablabla
const foo = 1;`);

      editor._insertAtTop("import { vi } from 'vitest';\n");

      expect(editor.commit()).toBe(
        `\
/* license header */
// blablabla
import { vi } from 'vitest';
const foo = 1;`,
      );
    });
  });

  describe('insertBefore', () => {
    it('inserts text immediately before the given node', () => {
      const editor = new SgEditor('describe("suite", () => {});');

      editor.insertBefore(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        editor.root.find('describe($$$ARGS)')!,
        '// before suite\n',
      );

      expect(editor.commit()).toBe(
        `\
// before suite
describe("suite", () => {});`,
      );
    });
  });

  describe('replaceNode', () => {
    it('replaces the given node with new text', () => {
      const editor = new SgEditor('const foo = 42;');

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      editor.replaceNode(editor.root.find('foo')!, 'bar');

      expect(editor.commit()).toBe('const bar = 42;');
    });
  });

  describe('commit', () => {
    it('returns the original content when no edits were made', () => {
      const content = 'const foo = 1;';

      expect(new SgEditor(content).commit()).toBe(content);
    });
    it('applies multiple edits in one commit', () => {
      const editor = new SgEditor('const foo = 42;');

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      editor.replaceNode(editor.root.find('foo')!, 'bar');
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      editor.replaceNode(editor.root.find('42')!, '43');

      expect(editor.commit()).toBe('const bar = 43;');
    });
  });

  describe('ensureSymbol', () => {
    it('ensures that a symbol is imported', () => {
      const editor = new SgEditor('foo();');

      editor.ensureSymbol({ symbol: 'foo', module: './foo' });

      expect(editor.commit()).toBe(
        `\
import { foo } from './foo';
foo();`,
      );
    });

    it('adds the import once', () => {
      const editor = new SgEditor('foo();');

      editor.ensureSymbol({ symbol: 'foo', module: './foo' });
      editor.ensureSymbol({ symbol: 'foo', module: './foo' });

      expect(editor.commit()).toBe(
        `\
import { foo } from './foo';
foo();`,
      );
    });

    it('adds the symbol to the import if it is already imported', () => {
      const editor = new SgEditor(`\
import { something } from './foo';
foo();
`);

      editor.ensureSymbol({ symbol: 'foo', module: './foo' });

      expect(editor.commit()).toBe(
        `\
import { something, foo } from './foo';
foo();
`,
      );
    });
  });
});
