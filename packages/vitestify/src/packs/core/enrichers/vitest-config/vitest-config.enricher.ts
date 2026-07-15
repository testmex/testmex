import { basename } from 'node:path/posix';
import { defineEnricher } from '../../../../core/models/enricher';
import { fileTags } from '../../identifiers';

const VITEST_CONFIG_FILE_NAMES = [
  'vitest.config.mts',
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.config.cjs',
  'vitest.config.cts',
] as const;

const VITEST_CONFIG_GLOB_PATTERN =
  '**/vitest.config.{mts,ts,js,mjs,cjs,cts}';

export const vitestConfigEnricher = defineEnricher({
  name: 'vitest-config',
  async enrich({ workspace, onProgress }) {
    const files = [];
    for await (const path of workspace.tree.scanDirectory({
      pattern: VITEST_CONFIG_GLOB_PATTERN,
    })) {
      if (
        !VITEST_CONFIG_FILE_NAMES.some((name) => basename(path).endsWith(name))
      ) {
        continue;
      }

      files.push(path);
      onProgress?.(`${files.length} file(s) found`);
    }

    return {
      fileInfos: files.map((path) => ({ path, tags: [fileTags.vitestConfig] })),
    };
  },
});
