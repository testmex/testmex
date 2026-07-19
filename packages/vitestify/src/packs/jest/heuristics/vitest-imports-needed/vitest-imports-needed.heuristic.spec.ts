import { describe, expect, it } from 'vitest';
import type { FindingType } from '../../../../core/models/finding';
import { relativePath } from '../../../../core/models/relative-path';
import {
  createTestingWorkspace,
  WorkspaceFileMother,
  WorkspaceMother,
} from '../../../../core/models/workspace.mother';
import { ProgressTracker } from '../../../../core/models/progress-tracker';
import { Analyzer } from '../../../../pipeline/analyzer';
import { fileTags } from '../../../core/identifiers';
import { vitestImportsNeededHeuristic } from './vitest-imports-needed.heuristic';

describe(vitestImportsNeededHeuristic.name, () => {
  it('matches `expect`', async () => {
    expect(await _analyzeFile(`expect(value).toBe(expected);`)).toEqual([
      'vitest-imports-needed',
    ]);
  });

  it('matches `it`', async () => {
    expect(await _analyzeFile(`it('should do something', () => {`)).toEqual([
      'vitest-imports-needed',
    ]);
  });

  it('matches indented `it`', async () => {
    expect(await _analyzeFile(`   it('should do something', () => {`)).toEqual([
      'vitest-imports-needed',
    ]);
  });

  it('matches tab-indented `it`', async () => {
    expect(await _analyzeFile(`\tit('should do something', () => {`)).toEqual([
      'vitest-imports-needed',
    ]);
  });

  it('does not over-match', async () => {
    expect(await _analyzeFile(`export const label = 'réitération';`)).toEqual(
      [],
    );
  });

  it('does not match globals in string literals', async () => {
    expect(await _analyzeFile(`const label = 'it should not match';`)).toEqual(
      [],
    );
  });

  it('does not match globals in comments', async () => {
    expect(await _analyzeFile(`// it should not match`)).toEqual([]);
  });
});

async function _analyzeFile(content: string): Promise<FindingType[]> {
  const filePath = relativePath('apps/my-app/src/file.ts');
  const workspace = createTestingWorkspace(
    WorkspaceMother.withApp('my-app').withFile(
      WorkspaceFileMother.file({
        appName: 'my-app',
        content,
        fileName: 'src/file.ts',
        tags: [fileTags.code],
      }).build(),
    ),
  );

  const analyzer = new Analyzer({
    heuristics: [vitestImportsNeededHeuristic],
    progressTracker: new ProgressTracker(),
  });
  await analyzer.analyze(workspace);

  return workspace.files.find((file) => file.path === filePath)?.findings ?? [];
}
