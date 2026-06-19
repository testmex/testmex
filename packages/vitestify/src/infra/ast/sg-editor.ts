import { Edit, Lang, parse, SgNode } from '@ast-grep/napi';

export class SgEditor {
  readonly root: SgRootNode;
  private readonly _edits: Edit[] = [];
  private readonly _ensuredSymbols: Set<string> = new Set();

  constructor(content: string, lang = Lang.TypeScript) {
    this.root = parse(lang, content).root();
  }

  commit(): string {
    return this.root.commitEdits(this._edits);
  }

  ensureSymbol(args: { symbol: string; module: string }): string {
    const { symbol, module } = args;
    if (this._ensuredSymbols.has(symbol)) {
      return symbol;
    }

    const moduleImports = _findModuleImports(this.root, module);

    /* Found it. */
    if (moduleImports.some(({ symbols }) => symbols.includes(symbol))) {
      return symbol;
    }

    /* Module is imported, but the symbol is not. Let's edit the import. */
    if (moduleImports.length > 0) {
      this.replaceNode(
        moduleImports[0].node,
        `import { ${moduleImports[0].symbols.join(', ')}, ${symbol} } from '${module}';`,
      );
    } else {
      /* Module is not imported. Let's create it. */
      this._insertAtTop(`import { ${symbol} } from '${module}';\n`);
    }

    this._ensuredSymbols.add(symbol);

    return symbol;
  }

  insertBefore(node: SgNode, text: string): void {
    const start = node.range().start.index;
    this._edits.push({
      startPos: start,
      endPos: start,
      insertedText: text,
    });
  }

  replaceNode(node: SgNode, replacement: string): void {
    this._edits.push(node.replace(replacement));
  }

  private _insertAtTop(text: string): void {
    const firstNonCommentStatement = this.root
      .children()
      .find((child) => child.kind() !== 'comment');
    const position = firstNonCommentStatement?.range().start.index ?? 0;

    this._edits.push({
      startPos: position,
      endPos: position,
      insertedText: text,
    });
  }
}

export type SgRootNode = ReturnType<ReturnType<typeof parse>['root']>;

function _findModuleImports(
  root: SgRootNode,
  module: string,
): Array<{ node: SgNode; symbols: string[] }> {
  return root
    .findAll('import { $$$NAMES } from $SOURCE')
    .filter(
      (imp) =>
        imp
          .getMatch('SOURCE')
          ?.find({ rule: { kind: 'string_fragment' } })
          ?.text() === module,
    )
    .map((imp) => ({
      node: imp,
      symbols: imp
        .getMultipleMatches('NAMES')
        .map((name) => name.text().trim()),
    }));
}
