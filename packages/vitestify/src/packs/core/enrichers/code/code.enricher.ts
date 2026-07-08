import { Enricher } from '../../../../core/models/enricher';
import type { ReadonlyWorkspace } from '../../../../core/domain/workspace';
import { fileTags } from '../../identifiers';
import { isCodeFile } from '../../utils';

export class CodeEnricher implements Enricher {
  async enrich(workspace: ReadonlyWorkspace) {
    const files = await workspace.tree.scanDirectory();

    return {
      fileInfos: files
        .filter(isCodeFile)
        .map((path) => ({ path, tags: [fileTags.code] })),
    };
  }
}
