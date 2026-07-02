import { basename } from 'node:path/posix';
import type { RelativePath } from '../../core/models/relative-path';

const EXCLUDED_CODE_FILE_NAMES = [
  'jest.config.ts',
  'vite.config.ts',
  'vitest.config.ts',
];

export function isTestFile(path: RelativePath): boolean {
  return (
    path.endsWith('.spec.ts') ||
    path.endsWith('.spec.tsx') ||
    path.endsWith('.test.ts') ||
    path.endsWith('.test.tsx')
  );
}

export function isCodeFile(path: RelativePath): boolean {
  return (
    isTypeScriptFile(path) && !isTestFile(path) && !isExcludedCodeFile(path)
  );
}

function isTypeScriptFile(path: RelativePath): boolean {
  return (
    (path.endsWith('.ts') || path.endsWith('.tsx')) && !path.endsWith('.d.ts')
  );
}

function isExcludedCodeFile(path: RelativePath): boolean {
  const name = basename(path);

  return EXCLUDED_CODE_FILE_NAMES.includes(name) || name.endsWith('.setup.ts');
}
