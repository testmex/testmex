import { dirname, join } from 'node:path/posix';
import type { ReadonlyTree, Tree } from '../../../core/domain/tree';
import type { Finding } from '../../../core/models/finding';
import {
  relativePath,
  type RelativePath,
} from '../../../core/models/relative-path';
import { defineTransform } from '../../../core/models/transform';
import { SgEditor } from '../../../infra/ast/sg-editor';
import { fileTags, findingTypes } from '../identifiers';

const ANGULAR_SETUP_CONTENT = `\
import '@angular/compiler';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed();
`;
const ANGULAR_SETUP_FILE_NAME = 'angular.setup.ts';
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
    let needsAnalog = false;

    for (const file of info.getFiles()) {
      if (!file.tags.includes(fileTags.jestConfig)) {
        continue;
      }

      const jestConfigPath = file.path;
      const jestDirectory = relativePath(dirname(jestConfigPath));

      if (await _hasVitestConfig(tree, jestConfigPath)) {
        continue;
      }

      let setupFiles = await _extractJestSetupFiles(tree, file.path);

      setupFiles = _maybeAppendJestDomVitestSetup({
        findings,
        projectPath: jestDirectory,
        setupFiles,
      });

      setupFiles = await _maybeAppendAngularVitestSetup({
        findings,
        projectPath: jestDirectory,
        setupFiles,
        tree,
      });

      const useAngular = _projectUsesAngular(findings, jestDirectory);
      needsAnalog ||= useAngular;

      const useJsdom = _projectUsesDom(findings, jestDirectory);

      const moduleNameMappings = await _extractJestModuleNameMappers(
        tree,
        file.path,
      );

      await tree.write(
        relativePath(join(jestDirectory, VITEST_CONFIG_FILE_NAME)),
        _vitestConfigContent({
          moduleNameMappings,
          setupFiles,
          useAngular,
          useJsdom,
        }),
      );
    }

    if (needsAnalog) {
      commands.add([
        info.packageManager,
        'add',
        '-D',
        '@analogjs/vite-plugin-angular',
        '@analogjs/vitest-angular',
      ]);
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

interface JestModuleNameMapping {
  find: string;
  replacement: string;
}

async function _extractJestModuleNameMappers(
  tree: ReadonlyTree,
  jestConfigPath: RelativePath,
): Promise<JestModuleNameMapping[]> {
  const jestConfigContent = await tree.maybeReadFile(jestConfigPath);
  if (jestConfigContent == null) {
    return [];
  }

  const editor = new SgEditor(jestConfigContent);

  const moduleNameMapperPair = editor.root
    .findAll({ rule: { kind: 'pair' } })
    .find((node) => node.child(0)?.text() === 'moduleNameMapper');

  if (moduleNameMapperPair == null) {
    return [];
  }

  return (
    moduleNameMapperPair
      .child(2)
      ?.findAll({ rule: { kind: 'pair' } })
      .map((pair) => {
        const find = pair
          .child(0)
          ?.find({ rule: { kind: 'string_fragment' } })
          ?.text();
        const replacement = pair
          .child(2)
          ?.find({ rule: { kind: 'string_fragment' } })
          ?.text();

        if (find == null || replacement == null) {
          return null;
        }

        return { find, replacement };
      })
      .filter((mapping) => mapping != null) ?? []
  );
}

function _resolveAliasBlock(
  moduleNameMappings: JestModuleNameMapping[],
): string {
  return `\
  resolve: {
    alias: [
${moduleNameMappings
  .map(
    (mapping) => `\
      {
        find: ${_formatModuleNameMapperFind(mapping.find)},
        replacement: ${_formatModuleNameMapperReplacement(mapping.replacement)},
      }`,
  )
  .join(',\n')},
    ],
  },
`;
}

function _formatModuleNameMapperFind(find: string): string {
  if (find.startsWith('^') || find.endsWith('$')) {
    return `/${find}/`;
  }

  return JSON.stringify(find);
}

function _formatModuleNameMapperReplacement(replacement: string): string {
  const path = replacement.replace(/^<rootDir>\/?/, '');

  return `join(import.meta.dirname, '${path}')`;
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

function _maybeAppendJestDomVitestSetup({
  setupFiles,
  findings,
  projectPath,
}: {
  setupFiles: string[];
  findings: Finding[];
  projectPath: RelativePath;
}): string[] {
  if (_projectUsesTestingLibraryJestDom(findings, projectPath)) {
    setupFiles = [...setupFiles, '@testing-library/jest-dom/vitest'];
  }

  return setupFiles;
}

function _projectUsesTestingLibraryJestDom(
  findings: Finding[],
  projectPath: RelativePath,
): boolean {
  return findings.some(
    (finding) =>
      finding.type === findingTypes.testingLibraryJestDom &&
      finding.project.path === projectPath,
  );
}

function _projectUsesAngular(
  findings: Finding[],
  projectPath: RelativePath,
): boolean {
  return findings.some(
    (finding) =>
      finding.type === findingTypes.angular &&
      finding.project.path === projectPath,
  );
}

async function _maybeAppendAngularVitestSetup({
  setupFiles,
  findings,
  projectPath,
  tree,
}: {
  setupFiles: string[];
  findings: Finding[];
  projectPath: RelativePath;
  tree: Tree;
}): Promise<string[]> {
  if (!_projectUsesAngular(findings, projectPath)) {
    return setupFiles;
  }

  await tree.write(
    relativePath(join(projectPath, ANGULAR_SETUP_FILE_NAME)),
    ANGULAR_SETUP_CONTENT,
  );

  return [...setupFiles, './angular.setup.ts'];
}

function _vitestConfigContent({
  moduleNameMappings,
  setupFiles,
  useAngular,
  useJsdom,
}: {
  moduleNameMappings: JestModuleNameMapping[];
  setupFiles: string[];
  useAngular: boolean;
  useJsdom: boolean;
}): string {
  const angularImport = useAngular
    ? "import angular from '@analogjs/vite-plugin-angular';\n"
    : '';
  const environmentBlock = useJsdom ? `    environment: 'jsdom',\n` : '';
  const analogPlugin = useAngular ? '    angular({ jit: false }),\n' : '';
  const pluginsBlock = `\
  plugins: [
${analogPlugin}\
    tsconfigPaths(),
  ],`;

  const setupFilesBlock =
    setupFiles.length === 0
      ? ''
      : `\
    setupFiles: [
      ${setupFiles
        .map((path) =>
          path.startsWith('@')
            ? `'${path}'`
            : `join(import.meta.dirname, ${JSON.stringify(path.replace(/^<rootDir>\/?/, './'))})`,
        )
        .join(',\n      ')},
    ],
`;
  const resolveBlock =
    moduleNameMappings.length === 0
      ? ''
      : _resolveAliasBlock(moduleNameMappings);

  const needsJoinImport =
    setupFiles.length > 0 || moduleNameMappings.length > 0;
  const joinImport = needsJoinImport
    ? "import { join } from 'node:path';\n"
    : '';

  return `\
${joinImport}\
${angularImport}\
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config';

export default defineConfig({
${pluginsBlock}
${resolveBlock}\
  test: {
${environmentBlock}\
    include: ['**/*.{test,spec}.{ts,tsx}'],
${setupFilesBlock}\
  },
});
`;
}
