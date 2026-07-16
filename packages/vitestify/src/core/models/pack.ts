import { Enricher } from './enricher';
import { Heuristic } from './heuristic';
import { Transform } from './transform';

export interface Pack {
  name: string;
  enrichers: Enricher[];
  heuristics: Heuristic[];
  transforms: Transform[];
}

export interface DefinePackArgs {
  name: string;
  enrichers?: Enricher[];
  heuristics?: Heuristic[];
  transforms?: Transform[];
}

export function definePack(args: DefinePackArgs): Pack {
  return {
    name: args.name,
    enrichers: args.enrichers ?? [],
    heuristics: args.heuristics ?? [],
    transforms: args.transforms ?? [],
  };
}
