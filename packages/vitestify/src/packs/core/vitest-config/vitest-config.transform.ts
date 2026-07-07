import { dirname, join } from 'node:path/posix';
import type { Tree } from '../../../core/domain/tree';
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
const TESTING_LIBRARY_SETUP_CONTENT = `\
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
`;
const TESTING_LIBRARY_SETUP_FILE_NAME = 'testing-library.setup.ts';
const VITEST_CONFIG_FILE_NAME = 'vitest.config.mts';
const VITEST_CONFIG_ALTERNATIVE_FILE_NAMES = [
  VITEST_CONFIG_FILE_NAME,
  'vitest.config.ts',
];

export const vitestConfigTransform = defineTransform({
  name: 'vitest-config',
  apply: async (workspace) => {
    const { commands, findings, info, tree } = workspace;
    const devDependencies = new Set<string>(['vite-tsconfig-paths', 'vitest']);

    for (const file of workspace.getFiles()) {
      if (!file.tags.includes(fileTags.jestConfig)) {
        continue;
      }

      const jestConfigPath = file.path;
      const context: VitestConfigTransformContext = {
        findings,
        jestConfigDirectory: relativePath(dirname(jestConfigPath)),
        jestConfigPath,
        moduleNameMappings: [],
        setupFiles: [],
        tree,
      };

      /* Project already has a vitest config. Skipping... */
      if (await _hasVitestConfig(context)) {
        continue;
      }

      _analyzeAngularUsage(context);
      _analyzeReactUsage(context);
      _analyzeDomUsage(context);
      _analyzeTestingLibraryReactUsage(context);

      await _analyzeJestConfig(context);

      _maybeAppendJestDomVitestSetup(context);

      if (context.usesAngular) {
        await _addAngularVitestSetup(context);
        devDependencies.add('@analogjs/vite-plugin-angular');
        devDependencies.add('@analogjs/vitest-angular');
      }
      if (context.usesReact) {
        devDependencies.add('@vitejs/plugin-react');
      }

      await _maybeAddTestingLibraryReactSetup(context);

      await _writeVitestConfig(context);

      if (devDependencies.size > 0) {
        commands.add([info.packageManager, 'add', '-D', ...devDependencies]);
      }
    }
  },
});

interface VitestConfigTransformContext {
  findings: readonly Finding[];
  jestConfigDirectory: RelativePath;
  jestConfigPath: RelativePath;
  moduleNameMappings: JestModuleNameMapping[];
  setupFiles: string[];
  tree: Tree;
  usesAngular?: boolean;
  usesJsdom?: boolean;
  usesReact?: boolean;
  usesTestingLibraryReact?: boolean;
}

async function _hasVitestConfig(
  context: VitestConfigTransformContext,
): Promise<boolean> {
  for (const fileName of VITEST_CONFIG_ALTERNATIVE_FILE_NAMES) {
    if (
      (await context.tree.maybeReadFile(
        relativePath(join(context.jestConfigDirectory, fileName)),
      )) !== null
    ) {
      return true;
    }
  }

  return false;
}

async function _analyzeJestConfig(
  context: VitestConfigTransformContext,
): Promise<void> {
  const jestConfigContent = await context.tree.maybeReadFile(
    context.jestConfigPath,
  );
  if (jestConfigContent == null) {
    return;
  }

  const editor = new SgEditor(jestConfigContent);

  /* Extract setup files from jest config */
  context.setupFiles = editor.root
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

  /* Extract module name mappings from jest config */
  context.moduleNameMappings =
    editor.root
      .findAll({ rule: { kind: 'pair' } })
      .find((node) => node.child(0)?.text() === 'moduleNameMapper')
      ?.child(2)
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
      .filter((mapping) => mapping != null) ?? [];
}

interface JestModuleNameMapping {
  find: string;
  replacement: string;
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

function _analyzeDomUsage(context: VitestConfigTransformContext): void {
  context.usesJsdom = context.findings.some(
    (finding) =>
      finding.type === findingTypes.dom &&
      finding.projects.some(
        (project) => project.path === context.jestConfigDirectory,
      ),
  );
}

function _maybeAppendJestDomVitestSetup(
  context: VitestConfigTransformContext,
): void {
  const usesTestingLibraryJestDom = context.findings.some(
    (finding) =>
      finding.type === findingTypes.testingLibraryJestDom &&
      finding.projects.some(
        (project) => project.path === context.jestConfigDirectory,
      ),
  );
  if (usesTestingLibraryJestDom) {
    context.setupFiles = [
      ...context.setupFiles,
      '@testing-library/jest-dom/vitest',
    ];
  }
}

function _analyzeAngularUsage(context: VitestConfigTransformContext) {
  context.usesAngular = context.findings.some(
    (finding) =>
      finding.type === findingTypes.angular &&
      finding.projects.some(
        (project) => project.path === context.jestConfigDirectory,
      ),
  );
}

function _analyzeReactUsage(context: VitestConfigTransformContext) {
  context.usesReact = context.findings.some(
    (finding) =>
      finding.type === findingTypes.react &&
      finding.projects.some(
        (project) => project.path === context.jestConfigDirectory,
      ),
  );
}

function _analyzeTestingLibraryReactUsage(
  context: VitestConfigTransformContext,
): void {
  context.usesTestingLibraryReact = context.findings.some(
    (finding) =>
      finding.type === findingTypes.testingLibraryReact &&
      finding.projects.some(
        (project) => project.path === context.jestConfigDirectory,
      ),
  );
}

async function _maybeAddTestingLibraryReactSetup(
  context: VitestConfigTransformContext,
): Promise<void> {
  if (!context.usesTestingLibraryReact) {
    return;
  }

  await context.tree.write(
    relativePath(
      join(context.jestConfigDirectory, TESTING_LIBRARY_SETUP_FILE_NAME),
    ),
    TESTING_LIBRARY_SETUP_CONTENT,
  );

  context.setupFiles = [
    ...context.setupFiles,
    `./${TESTING_LIBRARY_SETUP_FILE_NAME}`,
  ];
}

async function _addAngularVitestSetup(
  context: VitestConfigTransformContext,
): Promise<void> {
  await context.tree.write(
    relativePath(join(context.jestConfigDirectory, ANGULAR_SETUP_FILE_NAME)),
    ANGULAR_SETUP_CONTENT,
  );

  context.setupFiles = [...context.setupFiles, `./${ANGULAR_SETUP_FILE_NAME}`];
}

async function _writeVitestConfig(
  context: VitestConfigTransformContext,
): Promise<void> {
  const angularImport = context.usesAngular
    ? "import angular from '@analogjs/vite-plugin-angular';\n"
    : '';
  const reactImport = context.usesReact
    ? "import react from '@vitejs/plugin-react';\n"
    : '';
  const environmentBlock = context.usesJsdom
    ? `    environment: 'jsdom',\n`
    : '';
  const analogPlugin = context.usesAngular
    ? '    angular({ jit: false }),\n'
    : '';
  const reactPlugin = context.usesReact ? '    react(),\n' : '';
  const pluginsBlock = `\
  plugins: [
${analogPlugin}\
${reactPlugin}\
    tsconfigPaths(),
  ],`;

  const setupFilesBlock =
    context.setupFiles.length === 0
      ? ''
      : `\
    setupFiles: [
      ${context.setupFiles
        .map((path) =>
          path.startsWith('@')
            ? `'${path}'`
            : `join(import.meta.dirname, ${JSON.stringify(path.replace(/^<rootDir>\/?/, './'))})`,
        )
        .join(',\n      ')},
    ],
`;
  const resolveBlock =
    context.moduleNameMappings.length === 0
      ? ''
      : _resolveAliasBlock({ moduleNameMappings: context.moduleNameMappings });

  const needsJoinImport =
    context.setupFiles.length > 0 || context.moduleNameMappings.length > 0;
  const joinImport = needsJoinImport
    ? "import { join } from 'node:path';\n"
    : '';

  const content = `\
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

  await context.tree.write(
    relativePath(join(context.jestConfigDirectory, VITEST_CONFIG_FILE_NAME)),
    content,
  );
}
