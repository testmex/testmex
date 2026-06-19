import { SgEditor } from './sg-editor';

export function ensureVitestSymbol({
  symbol,
  editor,
}: {
  symbol: 'vi';
  editor: SgEditor;
}) {
  return editor.ensureSymbol({ symbol, module: 'vitest' });
}
