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

  replaceNode(node: SgNode, replacement: string): void {
    this._edits.push(node.replace(replacement));
  }
}

type SgRootNode = ReturnType<ReturnType<typeof parse>['root']>;
