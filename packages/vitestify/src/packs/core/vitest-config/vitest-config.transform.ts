import { dirname, join } from 'node:path/posix';
import type { ReadonlyTree } from '../../../core/domain/tree';
import type { Finding } from '../../../core/models/finding';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags, findingTypes } from '../identifiers';

const JEST_SETUP_FILE_KEYS = ['setupFiles', 'setupFilesAfterEnv'];

const VITEST_CONFIG_FILE_NAME = 'vitest.config.mts';
const VITEST_CONFIG_ALTERNATIVE_FILE_NAMES = [
  VITEST_CONFIG_FILE_NAME,
  'vitest.config.ts',
];

export const vitestConfigTransform = defineTransform({
  name: 'vitest-config',
  apply: async ({ findings, workspace }) => {
    const { commands, info, tree } = workspace;
    let needsJsdom = false;

    for (const file of info.getFiles()) {
      if (!file.tags.includes(fileTags.jestConfig)) {
        continue;
      }

      if (await _hasVitestConfig(tree, file.project.path)) {
        continue;
      }

      const setupFiles = await _extractJestSetupFiles(tree, file.path);
      const useJsdom = _projectUsesDom(findings, file.project.path);
      needsJsdom ||= useJsdom;

      await tree.write(
        relativePath(join(file.project.path, VITEST_CONFIG_FILE_NAME)),
        _vitestConfigContent({ setupFiles, useJsdom }),
      );
    }

    commands.add([info.packageManager, 'add', '-D', 'vite-tsconfig-paths']);
    commands.add([info.packageManager, 'add', '-D', 'vitest']);
  },
});

async function _hasVitestConfig(
  tree: ReadonlyTree,
  projectRoot: RelativePath,
): Promise<boolean> {
  for (const fileName of VITEST_CONFIG_ALTERNATIVE_FILE_NAMES) {
    if (
      (await tree.maybeReadFile(relativePath(join(projectRoot, fileName)))) !==
      null
    ) {
      return true;
    }
  }

  return false;
}

async function _extractJestSetupFiles(
  tree: ReadonlyTree,
  jestConfigPath: RelativePath,
): Promise<string[]> {
  const jestConfigContent = await tree.maybeReadFile(jestConfigPath);
  if (jestConfigContent == null) {
    return [];
  }

  const editor = new SgEditor(jestConfigContent);

  return editor.root
    .findAll({ rule: { kind: 'pair' } })
    .filter((node) => {
      const key = node.child(0)?.text();
      return key ? JEST_SETUP_FILE_KEYS.includes(key) : false;
    })
    .flatMap((node) =>
      node.child(2)?.findAll({ rule: { kind: 'string_fragment' } }),
    )
    .map((node) => node?.text())
    .filter((path) => path != null);
}

function _projectUsesDom(
  findings: Finding[],
  projectPath: RelativePath,
): boolean {
  return findings.some(
    (finding) =>
      finding.type === findingTypes.dom && finding.project.path === projectPath,
  );
}

function _vitestConfigContent({
  setupFiles,
  useJsdom,
}: {
  setupFiles: string[];
  useJsdom: boolean;
}): string {
  const environmentBlock = useJsdom ? `    environment: 'jsdom',\n` : '';
  const setupFilesBlock =
    setupFiles.length === 0
      ? ''
      : `\
    setupFiles: [
      ${setupFiles
        .map(
          (path) =>
            `join(import.meta.dirname, ${JSON.stringify(path.replace(/^<rootDir>\/?/, './'))})`,
        )
        .join(',\n      ')},
    ],
`;
  const joinImport =
    setupFiles.length === 0 ? '' : "import { join } from 'node:path';\n";

  return `\
${joinImport}\
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
${environmentBlock}\
    include: ['**/*.{test,spec}.{ts,tsx}'],
${setupFilesBlock}\
  },
});
`;
}
