import { basename } from 'node:path/posix';
import {
  Enricher,
  type EnricherOptions,
} from '../../../../core/models/enricher';
import { fileTags } from '../../identifiers';

const VITEST_CONFIG_FILE_NAMES = [
  'vitest.config.mts',
  'vitest.config.ts',
  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.config.cjs',
  'vitest.config.cts',
] as const;

export class VitestConfigEnricher implements Enricher {
  readonly name = 'vitest-config';

  async enrich({ workspace, onProgress }: EnricherOptions) {
    const files = [];
    for await (const path of workspace.tree.scanDirectory()) {
      if (
        !VITEST_CONFIG_FILE_NAMES.some((name) => basename(path).endsWith(name))
      ) {
        continue;
      }

      files.push(path);
      onProgress?.(`found ${files.length} file(s)`);
    }

    return {
      fileInfos: files.map((path) => ({ path, tags: [fileTags.vitestConfig] })),
    };
  }
}
