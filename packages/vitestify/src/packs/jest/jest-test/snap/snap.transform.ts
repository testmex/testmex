import { defineFileTransform } from '../../../../core/domain/define-file-transform';
import { findingTypes } from '../../identifiers';

export const snapTransform = defineFileTransform({
  name: 'snap',
  findingType: findingTypes.snapshot,
  apply: _rewriteSnap,
});

function _rewriteSnap(content: string): string {
  return content.replaceAll('Array [', '[').replaceAll('Object {', '{');
}
