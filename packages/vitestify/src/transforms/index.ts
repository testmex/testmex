import type { Transform } from '../core/transform';
import { jestMockTransform } from '../packs/jest/jest-mock-transform';

export const transforms: Transform[] = [jestMockTransform];
