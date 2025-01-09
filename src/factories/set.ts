import type { FactoryObservableContext } from 'keck/core/ObservableContext';
import type { ObservableFactory } from 'keck/factories/observableFactories';
import { registerClass } from 'keck/factories/registerClass';

const _size = Symbol('size');

class ObservableSet<T> extends Set<T> {
  constructor(private ctx: FactoryObservableContext<Set<T>>) {
    super();
  }

  private get set(): Set<T> {
    return this.ctx.value;
  }

  add(value: T): this {
    const size = this.set.size;
    this.set.add(value);
    if (size !== this.set.size) this.ctx.modifyIdentifier(_size);
    return this;
  }

  clear(): void {
    const size = this.set.size;
    this.set.clear();
    if (size !== this.set.size) this.ctx.modifyIdentifier(_size);
  }

  delete(value: T): boolean {
    const res = this.set.delete(value);
    if (res) this.ctx.modifyIdentifier(_size);
    return res;
  }

  forEach(callbackFn: (value: T, _key: T, set: Set<T>) => void, thisArg?: any): void {
    this.set.forEach((value, _key) => {
      const observable = this.ctx.observeIdentifier(value, value);
      callbackFn.call(thisArg, observable, observable, this);
    }, thisArg);
    void this.size;
  }

  has(value: T): boolean {
    this.ctx.observeIdentifier(_size);
    return this.set.has(value);
  }

  get size(): number {
    return this.ctx.observeIdentifier(_size, this.set.size);
  }

  *[Symbol.iterator](): SetIterator<T> {
    this.ctx.observeIdentifier(_size);
    for (const value of this.set) {
      yield this.ctx.observeIdentifier(value, value) as T;
    }
  }

  *entries(): SetIterator<[T, T]> {
    for (const value of this[Symbol.iterator]()) {
      yield [value, value];
    }
  }

  keys(): SetIterator<T> {
    return this[Symbol.iterator]();
  }

  values(): SetIterator<T> {
    return this[Symbol.iterator]();
  }
}

registerClass(Set, {
  makeObservable: (ctx) => {
    return new ObservableSet(ctx);
  },
} satisfies ObservableFactory<Set<unknown>>);
