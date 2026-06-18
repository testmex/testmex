import { EnricherFactory } from './enricher';
import { Heuristic } from './heuristic';
import { Transform } from './transform';

export interface Pack {
  name: string;
  enricherFactories: EnricherFactory[];
  heuristics: Heuristic[];
  transforms: Transform[];
}

export interface DefinePackArgs {
  name: string;
  enricherFactories?: EnricherFactory[];
  heuristics?: Heuristic[];
  transforms?: Transform[];
}

export function definePack(args: DefinePackArgs): Pack {
  return {
    name: args.name,
    enricherFactories: args.enricherFactories ?? [],
    heuristics: args.heuristics ?? [],
    transforms: args.transforms ?? [],
  };
}
