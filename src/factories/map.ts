import type { FactoryObservableContext } from 'keck/core/ObservableContext';
import type { ObservableFactory } from 'keck/factories/observableFactories';
import { registerObservableClass } from 'keck/factories/registerObservableClass';
import { atomic } from 'keck/methods/atomic';
import { unwrap } from 'keck/methods/unwrap';

const _size = Symbol('size');

export class ObservableMap<K, V> extends Map<K, V> {
  #ctx: FactoryObservableContext<Map<K, V>>;

  constructor(ctx: FactoryObservableContext<Map<K, V>>) {
    super();
    this.#ctx = ctx;
    Object.defineProperty(this, 'constructor', {
      value: Map,
      enumerable: false,
      configurable: true,
    });
  }

  private get map(): Map<K, V> {
    return this.#ctx.value;
  }

  clear(): void {
    const size = this.map.size;
    this.map.clear();
    if (size !== this.map.size) this.#ctx.modifyIdentifier(_size);
  }

  delete(key: K): boolean {
    const rawKey = unwrap(key);
    const res = this.map.delete(rawKey);
    if (res) {
      atomic(() => {
        this.#ctx.modifyIdentifier(rawKey);
        this.#ctx.modifyIdentifier(_size);
      });
    }
    return res;
  }

  forEach(callbackFn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this.map.forEach((value, key) => {
      const observable = this.#ctx.observeIdentifier(key, value);
      callbackFn.call(thisArg, observable, key, this);
    }, thisArg);
    void this.size;
  }

  get(key: K): V | undefined {
    const rawKey = unwrap(key);
    const value = this.map.get(rawKey);
    return this.#ctx.observeIdentifier(rawKey, value);
  }

  has(key: K): boolean {
    const rawKey = unwrap(key);
    this.#ctx.observeIdentifier(rawKey);
    return this.map.has(rawKey);
  }

  set(key: K, value: V): this {
    const rawKey = unwrap(key);
    const rawValue = unwrap(value);
    const size = this.map.size;
    const oldValue = this.map.get(rawKey);
    this.map.set(rawKey, rawValue);
    atomic(() => {
      if (size !== this.map.size) this.#ctx.modifyIdentifier(_size);
      if (oldValue !== rawValue) this.#ctx.modifyIdentifier(rawKey);
    });
    return this;
  }

  get size(): number {
    return this.#ctx.observeIdentifier(_size, this.#ctx.value.size);
  }

  /** Returns an iterable of entries in the map. */
  *[Symbol.iterator](): MapIterator<[K, V]> {
    this.#ctx.observeIdentifier(_size);
    for (const entry of this.map) {
      const observable = this.#ctx.observeIdentifier(entry[0], entry[1]);
      yield [entry[0], observable];
    }
  }

  entries(): MapIterator<[K, V]> {
    return this[Symbol.iterator]();
  }

  keys(): MapIterator<K> {
    this.#ctx.observeIdentifier(_size);
    return this.map.keys();
  }

  *values(): MapIterator<V> {
    for (const value of this[Symbol.iterator]()) {
      yield value[1];
    }
  }
}

registerObservableClass(Map, {
  makeObservable: (ctx) => {
    return new ObservableMap(ctx);
  },
} satisfies ObservableFactory<Map<unknown, unknown>>);
