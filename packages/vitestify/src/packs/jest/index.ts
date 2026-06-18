import { definePack } from '../../core/models/pack';
import { defaultExportsTransform } from './default-exports/default-exports-transform';
import { factoryFuncTransform } from './factory-func/factory-func-transform';
import { JestEnricher } from './jest-enricher';
import { jestGlobalsImportTransform } from './jest-globals-import/jest-globals-import-transform';
import { jestMockTransform } from './jest-mock/jest-mock-transform';
import { jestSetTimeoutTransform } from './jest-set-timeout/jest-set-timeout-transform';
import { jestSymbolHeuristic } from './jest-symbol/jest-symbol-heuristic';
import { jestTypesTransform } from './jest-types/jest-types-transform';
import { jestViTransform } from './jest-vi/jest-vi-transform';
import { replaceApiHeuristic } from './replace-api/replace-api-heuristic';
import { replaceApiTransform } from './replace-api/replace-api-transform';
import { snapHeuristic } from './snap/snap-heuristic';
import { snapTransform } from './snap/snap-transform';
import { vitestImportsHeuristic } from './vitest-imports/vitest-imports-heuristic';
import { vitestImportsTransform } from './vitest-imports/vitest-imports-transform';

export default definePack({
  name: 'jest',
  enricherFactories: [(args) => new JestEnricher(args)],
  heuristics: [
    vitestImportsHeuristic,
    jestSymbolHeuristic,
    replaceApiHeuristic,
    snapHeuristic,
  ],
  transforms: [
    vitestImportsTransform,
    jestGlobalsImportTransform,
    replaceApiTransform,
    factoryFuncTransform,
    defaultExportsTransform,
    jestMockTransform,
    jestViTransform,
    jestSetTimeoutTransform,
    jestTypesTransform,
    snapTransform,
  ],
});
