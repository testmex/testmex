import { ensureSymbol } from './ast-utils';
import { SgEditor } from './sg-editor';

export function ensureVitestSymbol(args: { symbol: 'vi'; editor: SgEditor }) {
  return ensureSymbol({
    ...args,
    module: 'vitest',
  });
}
