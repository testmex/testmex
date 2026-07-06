import { defineFileTransform } from '../../../core/domain/define-file-transform';
import { fileTags } from '../../core/identifiers';

export const configTestMatchTransform = defineFileTransform({
  name: 'config-test-match',
  fileTags: [fileTags.jestConfig],
  /**
   * @deprecated 🚧 work in progress
   */
  apply: (_content) => {
    throw new Error(`🚧 work in progress`);
  },
});
