import { basename } from 'node:path/posix';
import { Enricher, type EnricherOptions } from '../../../../core/models/enricher';
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

  async enrich({ workspace }: EnricherOptions) {
    const files = [];
    for await (const path of workspace.tree.scanDirectory()) {
      files.push(path);
    }

    return {
      fileInfos: files
        .filter((path) =>
          VITEST_CONFIG_FILE_NAMES.some((name) => basename(path).endsWith(name)),
        )
        .map((path) => ({ path, tags: [fileTags.vitestConfig] })),
    };
  }
}
