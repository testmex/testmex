import { defineEnricher } from '../../../../core/models/enricher';
import { fileTags } from '../../identifiers';
import { isCodeFile } from '../../utils';

const TYPESCRIPT_FILE_GLOB_PATTERN = '**/*.{ts,tsx}';

export const codeEnricher = defineEnricher({
  name: 'code',
  async enrich({ workspace, onProgress }) {
    const files = [];
    for await (const path of workspace.tree.scanDirectory({
      pattern: TYPESCRIPT_FILE_GLOB_PATTERN,
    })) {
      if (!isCodeFile(path)) {
        continue;
      }

      files.push(path);
      onProgress?.(`${files.length} file(s) found`);
    }

    return {
      fileInfos: files.map((path) => ({ path, tags: [fileTags.code] })),
    };
  },
});
