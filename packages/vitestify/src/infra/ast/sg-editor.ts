import { Edit, Lang, parse, SgNode } from '@ast-grep/napi';

export class SgEditor {
  readonly root: SgRootNode;
  private readonly _edits: Edit[] = [];

  constructor(content: string, lang = Lang.TypeScript) {
    this.root = parse(lang, content).root();
  }

  commit(): string {
    return this.root.commitEdits(this._edits);
  }

  insertAtTop(text: string): void {
    // TODO: improve this
    const leadingCommentPattern = /^(\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*\n|\s)+)/;

    const match = leadingCommentPattern.exec(this.root.text());

    const position = match?.[1].length ?? 0;

    this._edits.push({
      startPos: position,
      endPos: position,
      insertedText: text,
    });
  }

  replaceNode(node: SgNode, replacement: string): void {
    this._edits.push(node.replace(replacement));
  }
}

export type SgRootNode = ReturnType<ReturnType<typeof parse>['root']>;
