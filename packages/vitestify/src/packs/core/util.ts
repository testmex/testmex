import { basename } from 'node:path/posix';

export function isTest(file: string): boolean {
  return file.endsWith('.spec.ts') || file.endsWith('.spec.tsx');
}

export function isCodeFile(file: string): boolean {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
    return false;
  }
  if (file.endsWith('.d.ts')) {
    return false;
  }
  if (isTest(file)) {
    return false;
  }
  if (basename(file) === 'jest.config.ts') {
    return false;
  }
  return true;
}
