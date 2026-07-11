export class Entities<KEY, ENTITY extends object, COMPUTED extends object> {
  private readonly _entities = new Map<KEY, ENTITY & Partial<COMPUTED>>();
  private _cachedValues?: Array<ENTITY & COMPUTED>;
  private readonly _computedFns: ComputedFns<ENTITY, COMPUTED>;

  constructor({
    computed: computedFns = {},
  }: { computed?: ComputedFns<ENTITY, COMPUTED> } = {}) {
    this._computedFns = computedFns;
  }

  create(
    key: KEY,
    entity: ENTITY & Partial<COMPUTED>,
  ): ENTITY & Partial<COMPUTED> {
    this._entities.set(key, entity);
    this._invalidateCachedValues();

    return entity;
  }

  delete(key: KEY): void {
    this._entities.delete(key);
    this._invalidateCachedValues();
  }

  get(key: KEY): ENTITY | undefined {
    return this._entities.get(key);
  }

  invalidateComputedProperty<K extends keyof COMPUTED>(property: K): void {
    if (this._computedFns[property] === undefined) {
      return;
    }

    for (const entity of this._entities.values()) {
      entity[property] = undefined as (ENTITY & Partial<COMPUTED>)[K];
    }

    this._invalidateCachedValues();
  }

  update(key: KEY, updater: (entity: ENTITY) => void): ENTITY | undefined {
    const entity = this._entities.get(key);

    if (entity === undefined) {
      return undefined;
    }

    updater(entity);

    return entity;
  }

  values(): ENTITY[] {
    if (this._cachedValues !== undefined) {
      return this._cachedValues;
    }

    return (this._cachedValues = [...this._entities.values()].map((entity) =>
      this._resolveLazyProperties(entity),
    ));
  }

  private _invalidateCachedValues(): void {
    this._cachedValues = undefined;
  }

  private _resolveLazyProperties(
    entity: ENTITY & Partial<COMPUTED>,
  ): ENTITY & COMPUTED {
    for (const [key, resolver] of Object.entries(this._computedFns) as [
      keyof ENTITY,
      (entity: ENTITY) => ENTITY[keyof ENTITY],
    ][]) {
      if (entity[key] === undefined) {
        entity[key] = resolver(entity);
      }
    }

    return entity as ENTITY & COMPUTED;
  }
}

type ComputedFns<ENTITY extends object, COMPUTED extends object> = {
  [K in keyof COMPUTED]?: (entity: ENTITY) => COMPUTED[K];
};
