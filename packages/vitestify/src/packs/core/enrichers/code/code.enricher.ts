import {
  Enricher,
  type EnricherOptions,
} from '../../../../core/models/enricher';
import { fileTags } from '../../identifiers';
import { isCodeFile } from '../../utils';

export class CodeEnricher implements Enricher {
  readonly name = 'code';

  async enrich({ workspace, onProgress }: EnricherOptions) {
    const files = [];
    for await (const path of workspace.tree.scanDirectory()) {
      files.push(path);
      onProgress?.(`found ${files.length} file(s)`);
    }

    return {
      fileInfos: files
        .filter(isCodeFile)
        .map((path) => ({ path, tags: [fileTags.code] })),
    };
  }
}
