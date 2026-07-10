import { SgEditor } from './sg-editor';

export function ensureVitestSymbol({
  symbol,
  editor,
}: {
  symbol:
    | 'afterAll'
    | 'afterEach'
    | 'beforeAll'
    | 'beforeEach'
    | 'describe'
    | 'expect'
    | 'it'
    | 'test'
    | 'vi';
  editor: SgEditor;
}) {
  return editor.ensureSymbol({ symbol, module: 'vitest' });
}

export function ensureVitestTypeSymbol({
  symbol,
  editor,
}: {
  symbol: 'Mock' | 'MockedFunction';
  editor: SgEditor;
}) {
  return editor.ensureTypeSymbol({ symbol, module: 'vitest' });
}
