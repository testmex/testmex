import { defineFileTransform } from '../../../../../core/domain/define-file-transform';
import { fileTags } from '../../../../core/identifiers';

export const snapTransform = defineFileTransform({
  name: 'snap',
  fileTags: [fileTags.snapshot],
  apply: (content) => {
    return content.replaceAll('Array [', '[').replaceAll('Object {', '{');
  },
});
