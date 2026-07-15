import type { FileTag, ReadonlyWorkspace } from '../../../../core/domain/workspace';
import { defineEnricher } from '../../../../core/models/enricher';
import type { RelativePath } from '../../../../core/models/relative-path';
import { fileTags } from '../../identifiers';
import { isTestFile } from '../../utils';

const TEST_FILE_GLOB_PATTERN =
  '**/*.{snap,spec.ts,spec.tsx,test.ts,test.tsx}';

type TestDiscoveredFileType = typeof fileTags.snapshot | typeof fileTags.test;

interface TestDiscoveredFile {
  path: RelativePath;
  type: TestDiscoveredFileType;
}

export const testEnricher = defineEnricher({
  name: 'test',
  async enrich({ onProgress, workspace }) {
    const files: Array<{ type: FileTag; path: RelativePath }> = [];
    for await (const file of _discoverTestFiles(workspace)) {
      files.push(file);
      onProgress?.(`${files.length} file(s) found`);
    }

    const snapshotPaths = files
      .filter((file) => file.type === fileTags.snapshot)
      .map((file) => file.path);
    const testPaths = files
      .filter((file) => file.type === fileTags.test)
      .map((file) => file.path);

    return {
      fileInfos: [
        ...snapshotPaths.map((path) => ({
          path,
          tags: [fileTags.snapshot],
        })),
        ...testPaths.map((path) => ({
          path,
          tags: [fileTags.test],
        })),
      ],
    };
  },
});

async function* _discoverTestFiles(
  workspace: ReadonlyWorkspace,
): AsyncGenerator<TestDiscoveredFile> {
  for await (const path of workspace.tree.scanDirectory({
    pattern: TEST_FILE_GLOB_PATTERN,
  })) {
    if (path.endsWith('.snap')) {
      yield { path, type: fileTags.snapshot };
    }

    if (isTestFile(path)) {
      yield { path, type: fileTags.test };
    }
  }
}
