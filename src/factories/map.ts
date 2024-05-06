import { type FactoryObservableContext } from "#keck/core/ObservableContext";
import { type ObservableFactory } from "#keck/factories/observableFactories";
import { registerClass } from "#keck/factories/registerClass";
import { atomic } from "#keck/methods/atomic";

const _size = Symbol("size");

export class ObservableMap<K, V> extends Map<K, V> {
  constructor(private ctx: FactoryObservableContext<Map<K, V>>) {
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
      atomic(() => {
        this.ctx.modifyIdentifier(key);
        this.ctx.modifyIdentifier(_size);
      });
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
    const value = this.map.get(key);
    return this.ctx.observeIdentifier(key, value);
  }

  has(key: K): boolean {
    this.ctx.observeIdentifier(key);
    return this.map.has(key);
  }

  set(key: K, value: V): this {
    const size = this.map.size;
    const oldValue = this.map.get(key);
    this.map.set(key, value);
    atomic(() => {
      if (size !== this.map.size) this.ctx.modifyIdentifier(_size);
      if (oldValue !== value) this.ctx.modifyIdentifier(key);
    });
    return this;
  }

  get size(): number {
    return this.ctx.observeIdentifier(_size, this.ctx.value.size);
  }

  /** Returns an iterable of entries in the map. */
  *[Symbol.iterator](): IterableIterator<[K, V]> {
    this.ctx.observeIdentifier(_size);
    for (const entry of this.map) {
      const observable = this.ctx.observeIdentifier(entry[0], entry[1]);
      yield [entry[0], observable];
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
    for (const value of this[Symbol.iterator]()) {
      yield value[1];
    }
  }
}

registerClass(Map, {
  makeObservable: (ctx) => {
    return new ObservableMap(ctx);
  },
} satisfies ObservableFactory<Map<unknown, unknown>>);
