import { RelativePath } from 'src/core/models/relative-path';
import {
  Enricher,
  type EnricherOptions,
} from '../../../../core/models/enricher';
import { fileTags } from '../../identifiers';
import { isTestFile } from '../../utils';

export class TestEnricher implements Enricher {
  readonly name = 'test';

  async enrich({ onProgress, workspace }: EnricherOptions) {
    const files: RelativePath[] = [];
    for await (const path of workspace.tree.scanDirectory()) {
      files.push(path);
      onProgress?.(`${files.length} files`);
    }

    return {
      fileInfos: [
        ...files
          .filter((file) => file.endsWith('.snap'))
          .map((path) => ({ path, tags: [fileTags.snapshot] })),
        ...files
          .filter((file) => isTestFile(file))
          .map((path) => ({ path, tags: [fileTags.test] })),
      ],
    };
  }
}
