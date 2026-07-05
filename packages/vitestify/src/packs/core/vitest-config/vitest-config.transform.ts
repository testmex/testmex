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
    let needsReact = false;

    for (const file of info.getFiles()) {
      if (!file.tags.includes(fileTags.jestConfig)) {
        continue;
      }

      const jestConfigPath = file.path;
      const jestDirectory = relativePath(dirname(jestConfigPath));

      if (await _hasVitestConfig({ projectRoot: jestConfigPath, tree })) {
        continue;
      }

      let setupFiles = await _extractJestSetupFiles({
        jestConfigPath,
        tree,
      });

      setupFiles = _maybeAppendJestDomVitestSetup({
        findings,
        jestDirectory: jestDirectory,
        setupFiles,
      });

      setupFiles = await _maybeAppendAngularVitestSetup({
        findings,
        jestDirectory: jestDirectory,
        setupFiles,
        tree,
      });

      const useAngular = _projectUsesAngular({
        findings,
        jestDirectory,
      });
      needsAnalog ||= useAngular;

      const useReact = _projectUsesReact({
        findings,
        jestDirectory: jestDirectory,
      });
      needsReact ||= useReact;

      const useJsdom = _projectUsesDom({
        findings,
        jestDirectory: jestDirectory,
      });

      const moduleNameMappings = await _extractJestModuleNameMappers({
        jestConfigPath: file.path,
        tree,
      });

      await tree.write(
        relativePath(join(jestDirectory, VITEST_CONFIG_FILE_NAME)),
        _vitestConfigContent({
          moduleNameMappings,
          setupFiles,
          useAngular,
          useJsdom,
          useReact,
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

    if (needsReact) {
      commands.add([info.packageManager, 'add', '-D', '@vitejs/plugin-react']);
    }

    commands.add([info.packageManager, 'add', '-D', 'vite-tsconfig-paths']);
    commands.add([info.packageManager, 'add', '-D', 'vitest']);
  },
});

async function _hasVitestConfig({
  projectRoot,
  tree,
}: {
  projectRoot: RelativePath;
  tree: ReadonlyTree;
}): Promise<boolean> {
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

async function _extractJestSetupFiles({
  jestConfigPath,
  tree,
}: {
  jestConfigPath: RelativePath;
  tree: ReadonlyTree;
}): Promise<string[]> {
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

async function _extractJestModuleNameMappers({
  jestConfigPath,
  tree,
}: {
  jestConfigPath: RelativePath;
  tree: ReadonlyTree;
}): Promise<JestModuleNameMapping[]> {
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

function _resolveAliasBlock({
  moduleNameMappings,
}: {
  moduleNameMappings: JestModuleNameMapping[];
}): string {
  return `\
  resolve: {
    alias: [
${moduleNameMappings
  .map(
    (mapping) => `\
      {
        find: ${_formatModuleNameMapperFind({ find: mapping.find })},
        replacement: ${_formatModuleNameMapperReplacement({
          replacement: mapping.replacement,
        })},
      }`,
  )
  .join(',\n')},
    ],
  },
`;
}

function _formatModuleNameMapperFind({ find }: { find: string }): string {
  if (find.startsWith('^') || find.endsWith('$')) {
    return `/${find}/`;
  }

  return JSON.stringify(find);
}

function _formatModuleNameMapperReplacement({
  replacement,
}: {
  replacement: string;
}): string {
  const path = replacement.replace(/^<rootDir>\/?/, '');

  return `join(import.meta.dirname, '${path}')`;
}

function _projectUsesDom({
  findings,
  jestDirectory,
}: {
  findings: Finding[];
  jestDirectory: RelativePath;
}): boolean {
  return findings.some(
    (finding) =>
      finding.type === findingTypes.dom &&
      finding.projects.some((project) => project.path === jestDirectory),
  );
}

function _maybeAppendJestDomVitestSetup({
  setupFiles,
  findings,
  jestDirectory,
}: {
  setupFiles: string[];
  findings: Finding[];
  jestDirectory: RelativePath;
}): string[] {
  if (_projectUsesTestingLibraryJestDom({ findings, jestDirectory })) {
    setupFiles = [...setupFiles, '@testing-library/jest-dom/vitest'];
  }

  return setupFiles;
}

function _projectUsesTestingLibraryJestDom({
  findings,
  jestDirectory,
}: {
  findings: Finding[];
  jestDirectory: RelativePath;
}): boolean {
  return findings.some(
    (finding) =>
      finding.type === findingTypes.testingLibraryJestDom &&
      finding.projects.some((project) => project.path === jestDirectory),
  );
}

function _projectUsesAngular({
  findings,
  jestDirectory,
}: {
  findings: Finding[];
  jestDirectory: RelativePath;
}): boolean {
  return findings.some(
    (finding) =>
      finding.type === findingTypes.angular &&
      finding.projects.some((project) => project.path === jestDirectory),
  );
}

function _projectUsesReact({
  findings,
  jestDirectory,
}: {
  findings: Finding[];
  jestDirectory: RelativePath;
}): boolean {
  return findings.some(
    (finding) =>
      finding.type === findingTypes.react &&
      finding.projects.some((project) => project.path === jestDirectory),
  );
}

async function _maybeAppendAngularVitestSetup({
  setupFiles,
  findings,
  jestDirectory,
  tree,
}: {
  setupFiles: string[];
  findings: Finding[];
  jestDirectory: RelativePath;
  tree: Tree;
}): Promise<string[]> {
  if (!_projectUsesAngular({ findings, jestDirectory })) {
    return setupFiles;
  }

  await tree.write(
    relativePath(join(jestDirectory, ANGULAR_SETUP_FILE_NAME)),
    ANGULAR_SETUP_CONTENT,
  );

  return [...setupFiles, './angular.setup.ts'];
}

function _vitestConfigContent({
  moduleNameMappings,
  setupFiles,
  useAngular,
  useJsdom,
  useReact,
}: {
  moduleNameMappings: JestModuleNameMapping[];
  setupFiles: string[];
  useAngular: boolean;
  useJsdom: boolean;
  useReact: boolean;
}): string {
  const angularImport = useAngular
    ? "import angular from '@analogjs/vite-plugin-angular';\n"
    : '';
  const reactImport = useReact
    ? "import react from '@vitejs/plugin-react';\n"
    : '';
  const environmentBlock = useJsdom ? `    environment: 'jsdom',\n` : '';
  const analogPlugin = useAngular ? '    angular({ jit: false }),\n' : '';
  const reactPlugin = useReact ? '    react(),\n' : '';
  const pluginsBlock = `\
  plugins: [
${analogPlugin}\
${reactPlugin}\
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
      : _resolveAliasBlock({ moduleNameMappings });

  const needsJoinImport =
    setupFiles.length > 0 || moduleNameMappings.length > 0;
  const joinImport = needsJoinImport
    ? "import { join } from 'node:path';\n"
    : '';

  return `\
${joinImport}\
${angularImport}\
${reactImport}\
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
