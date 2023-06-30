import { ObservableContext, observableFactories, ObservableFactory } from "../createObserver";

const _size = Symbol("size");

export class ObservableMap<K, V> extends Map<K, V> {
  constructor(private ctx: ObservableContext<Map<K, V>>) {
    super();
  }

  private get map(): Map<K, V> {
    return this.ctx.value;
  }

  clear(): void {
    const size = this.map.size;
    this.map.clear();
    if (size !== this.map.size) this.ctx.modifyIdentifier(_size);
  }

  delete(key: K): boolean {
    const res = this.map.delete(key);
    if (res) {
      this.ctx.modifyIdentifier(key);
      this.ctx.modifyIdentifier(_size);
    }
    return res;
  }

  forEach(callbackFn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.map.forEach((value, key) => {
      const observable = this.ctx.observeIdentifier(key, value);
      callbackFn.call(thisArg, observable, key, this);
    }, thisArg);
    void this.size;
  }

  get(key: K): V | undefined {
    this.ctx.observeIdentifier(key);
    return this.map.get(key);
  }

  has(key: K): boolean {
    this.ctx.observeIdentifier(key);
    return this.map.has(key);
  }

  set(key: K, value: V): this {
    const size = this.map.size;
    this.map.set(key, value);
    if (size !== this.map.size) {
      this.ctx.modifyIdentifier(key, value);
      this.ctx.modifyIdentifier(_size);
    }
    return this;
  }

  get size(): number {
    return this.ctx.observeIdentifier(_size, this.ctx.value.size);
  }

  /** Returns an iterable of entries in the map. */
  *[Symbol.iterator](): IterableIterator<[K, V]> {
    this.ctx.observeIdentifier(_size);
    for (const [key, value] of this.map) {
      const observable = this.ctx.observeIdentifier(key, value);
      yield [key, observable];
    }
  }

  entries(): IterableIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  keys(): IterableIterator<K> {
    this.ctx.observeIdentifier(_size);
    return this.map.keys();
  }

  *values(): IterableIterator<V> {
    for (const [key, value] of this[Symbol.iterator]()) {
      yield value;
    }
  }
}

observableFactories.set(Map, {
  makeObservable: (ctx) => {
    return new ObservableMap(ctx);
  },
  handleChange(value, identifier, newValue) {
    value.delete(identifier);
    value.set(identifier, newValue);
  },
  createClone(value) {
    return new Map(value);
  },
} as ObservableFactory<Map<unknown, unknown>, any>);
