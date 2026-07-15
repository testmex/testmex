import { dirname, join } from 'node:path/posix';
import type {
  FileInfoWithProjects,
  WorkspaceTree,
  WritableWorkspace,
} from '../../../../core/domain/workspace';
import type { FindingType } from '../../../../core/models/finding';
import {
  relativePath,
  type RelativePath,
} from '../../../../core/models/relative-path';
import { defineTransform } from '../../../../core/models/transform';
import { SgEditor } from '../../../../infra/ast/sg-editor';
import { getAngularJestBuilderProjectRoots } from '../../angular-json';
import { fileTags, findingTypes } from '../../identifiers';
import { vitestSetupFilePath } from '../../utils';

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
  apply: async (workspace, { onProgress } = {}) => {
    const { commands, files, tree } = workspace;
    const devDependencies = new Set<string>(['vite-tsconfig-paths', 'vitest']);
    let transformedCount = 0;

    for (const project of await _collectProjectsToTransform(workspace)) {
      const context: VitestConfigTransformContext = {
        files,
        jestConfigPath: project.jestConfigPath,
        moduleNameMappings: [],
        projectPath: project.path,
        setupFiles: [],
        tree,
        usesAngular: project.usesAngular,
      };

      /* Project already has a vitest config. Skipping... */
      if (await _hasVitestConfig(context)) {
        continue;
      }

      /* Workspace jest config that aggregates projects. Skipping... */
      if (
        project.jestConfigPath != null &&
        (await _definesJestProjects(context))
      ) {
        continue;
      }

      transformedCount += await _generateVitestConfig({
        context,
        devDependencies,
        workspace,
      });
    }

    if (devDependencies.size > 0) {
      commands.add([workspace.packageManager, 'add', '-D', ...devDependencies]);
    }

    onProgress?.(`${transformedCount} file(s) transformed`);
  },
});

interface VitestConfigTransformContext {
  files: FileInfoWithProjects[];
  projectPath: RelativePath;
  jestConfigPath: RelativePath | null;
  moduleNameMappings: JestModuleNameMapping[];
  setupFiles: string[];
  tree: WorkspaceTree;
  usesAngular?: boolean;
  usesJsdom?: boolean;
  usesReact?: boolean;
  usesTestingLibraryReact?: boolean;
}

async function _collectProjectsToTransform(
  workspace: WritableWorkspace,
): Promise<
  Array<{
    jestConfigPath: RelativePath | null;
    path: RelativePath;
    usesAngular?: boolean;
  }>
> {
  const angularProjects = new Map(
    (await getAngularJestBuilderProjectRoots(workspace.tree)).map((path) => [
      path,
      {
        usesAngular: true,
      },
    ]),
  );
  const jestConfigProjects = new Map(
    workspace.files
      .filter((file) => file.tags.includes(fileTags.jestConfig))
      .map((file) => [
        relativePath(dirname(file.path)),
        {
          jestConfigPath: file.path,
        },
      ]),
  );

  const projectPaths = new Set([
    ...angularProjects.keys(),
    ...jestConfigProjects.keys(),
  ]);

  return Array.from(projectPaths).map((path) => ({
    path,
    jestConfigPath: null,
    ...jestConfigProjects.get(path),
    ...angularProjects.get(path),
  }));
}

async function _generateVitestConfig({
  context,
  devDependencies,
  workspace,
}: {
  context: VitestConfigTransformContext;
  devDependencies: Set<string>;
  workspace: WritableWorkspace;
}): Promise<number> {
  if (context.usesAngular == null) {
    _analyzeAngularUsage(context);
  }
  _analyzeReactUsage(context);
  _analyzeDomUsage(context);
  _analyzeTestingLibraryReactUsage(context);

  await _analyzeJestConfig(context);

  _maybeAppendJestDomVitestSetup(context);

  let transformedCount = 0;

  if (context.usesAngular) {
    await _addAngularVitestSetup(context);
    transformedCount++;
    devDependencies.add('@analogjs/vite-plugin-angular');
    devDependencies.add('@analogjs/vitest-angular');
  }
  if (context.usesReact) {
    devDependencies.add('@vitejs/plugin-react');
  }

  if (context.usesTestingLibraryReact) {
    await _maybeAddTestingLibraryReactSetup(context);
    transformedCount++;
  }

  await _writeVitestConfig(context, workspace);
  transformedCount++;

  return transformedCount;
}

/**
 * Returns whether a jest config file is a workspace-level aggregator that lists
 * child projects instead of defining test settings for a single project.
 *
 * Nx and similar setups keep a root `jest.config.ts` that only exports
 * `projects`. Those files should not get a generated `vitest.config.mts`.
 *
 * @example
 * ```ts
 * // jest.config.ts — workspace aggregator, returns true
 * export default async (): Promise<Config> => ({
 *   projects: await getJestProjectsAsync(),
 * });
 *
 * // apps/my-app/jest.config.ts — project config, returns false
 * export default {
 *   setupFilesAfterEnv: ['./jest.setup.ts'],
 * };
 * ```
 */
async function _definesJestProjects(
  context: VitestConfigTransformContext,
): Promise<boolean> {
  if (context.jestConfigPath == null) {
    return false;
  }

  const jestConfigContent = await context.tree.maybeReadFile(
    context.jestConfigPath,
  );
  if (jestConfigContent == null) {
    return false;
  }

  const editor = new SgEditor(jestConfigContent);
  const config = editor.root.find('export default $CONFIG')?.getMatch('CONFIG');
  return (
    config
      ?.findAll({ rule: { kind: 'pair' } })
      .find((node) => node.child(0)?.text() === 'projects') != null
  );
}

async function _hasVitestConfig(
  context: VitestConfigTransformContext,
): Promise<boolean> {
  for (const fileName of VITEST_CONFIG_ALTERNATIVE_FILE_NAMES) {
    if (
      (await context.tree.maybeReadFile(
        relativePath(join(context.projectPath, fileName)),
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
  if (context.jestConfigPath == null) {
    return;
  }

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

function _formatSetupFilePathForVitestConfig(setupFilePath: string): string {
  const normalizedPath = setupFilePath.replace(/^<rootDir>\/?/, './');

  if (
    normalizedPath.startsWith('@') ||
    normalizedPath === `./${ANGULAR_SETUP_FILE_NAME}` ||
    normalizedPath === `./${TESTING_LIBRARY_SETUP_FILE_NAME}`
  ) {
    return normalizedPath;
  }

  return `./${vitestSetupFilePath(relativePath(normalizedPath))}`;
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

function _projectHasFinding({
  files,
  findingType,
  projectPath,
}: {
  files: FileInfoWithProjects[];
  findingType: FindingType;
  projectPath: RelativePath;
}): boolean {
  return files.some(
    (file) =>
      file.findings.includes(findingType) &&
      file.projects.some((project) => project.path === projectPath),
  );
}

function _analyzeDomUsage(context: VitestConfigTransformContext): void {
  context.usesJsdom = _projectHasFinding({
    files: context.files,
    findingType: findingTypes.dom,
    projectPath: context.projectPath,
  });
}

function _maybeAppendJestDomVitestSetup(
  context: VitestConfigTransformContext,
): void {
  const usesTestingLibraryJestDom = _projectHasFinding({
    files: context.files,
    findingType: findingTypes.testingLibraryJestDom,
    projectPath: context.projectPath,
  });
  if (usesTestingLibraryJestDom) {
    context.setupFiles = [
      ...context.setupFiles,
      '@testing-library/jest-dom/vitest',
    ];
  }
}

function _analyzeAngularUsage(context: VitestConfigTransformContext) {
  context.usesAngular = _projectHasFinding({
    files: context.files,
    findingType: findingTypes.angular,
    projectPath: context.projectPath,
  });
}

function _analyzeReactUsage(context: VitestConfigTransformContext) {
  context.usesReact = _projectHasFinding({
    files: context.files,
    findingType: findingTypes.react,
    projectPath: context.projectPath,
  });
}

function _analyzeTestingLibraryReactUsage(
  context: VitestConfigTransformContext,
): void {
  context.usesTestingLibraryReact = _projectHasFinding({
    files: context.files,
    findingType: findingTypes.testingLibraryReact,
    projectPath: context.projectPath,
  });
}

async function _maybeAddTestingLibraryReactSetup(
  context: VitestConfigTransformContext,
): Promise<void> {
  if (!context.usesTestingLibraryReact) {
    return;
  }

  await context.tree.write(
    relativePath(join(context.projectPath, TESTING_LIBRARY_SETUP_FILE_NAME)),
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
    relativePath(join(context.projectPath, ANGULAR_SETUP_FILE_NAME)),
    ANGULAR_SETUP_CONTENT,
  );

  context.setupFiles = [...context.setupFiles, `./${ANGULAR_SETUP_FILE_NAME}`];
}

async function _writeVitestConfig(
  context: VitestConfigTransformContext,
  workspace: WritableWorkspace,
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
            : `join(import.meta.dirname, ${JSON.stringify(_formatSetupFilePathForVitestConfig(path))})`,
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
  const configPath = relativePath(
    join(context.projectPath, VITEST_CONFIG_FILE_NAME),
  ); // Ensure that the config path is always relative to the project path

  await context.tree.write(configPath, content);
  workspace.tag(configPath, fileTags.vitestConfig);
}
