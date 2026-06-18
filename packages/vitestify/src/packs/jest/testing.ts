import {
  createTestingWorkspace,
  workspaceMother,
} from '../../core/models/workspace.mother';
import { relativePath } from '../../core/models/relative-path';
import type { Heuristic } from '../../core/models/heuristic';
import type { Transform } from '../../core/models/transform';
import { runTransform } from '../../testing/run-transform';

export interface TransformTestFileOptions {
  heuristics: Heuristic[];
  transforms: Transform[];
  appName?: string;
  filePath?: string;
  extraFiles?: Record<string, string>;
}

export async function transformTestFile(
  content: string,
  {
    appName = 'my-app',
    extraFiles = {},
    filePath = 'src/app.spec.ts',
    heuristics,
    transforms,
  }: TransformTestFileOptions,
): Promise<string | null> {
  let mother = workspaceMother.withApp(appName);

  for (const [extraPath, extraContent] of Object.entries(extraFiles)) {
    mother = mother.withAppFile(appName, extraPath, extraContent);
  }

  const workspace = createTestingWorkspace(
    mother.withAppFile(appName, filePath, content),
  );
  await runTransform({ workspace, heuristics, transforms });
  return workspace.tree.maybeReadFile(relativePath(`apps/${appName}/${filePath}`));
}
