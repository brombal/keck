import type { FactoryObservableContext } from 'keck/core/ObservableContext';
import type { ObservableFactory } from 'keck/factories/observableFactories';
import { registerObservableClass } from 'keck/factories/registerObservableClass';
import { atomic } from 'keck/methods/atomic';

const _size = Symbol('size');
const _has = Symbol('has');

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
    if (size !== this.set.size) {
      atomic(() => {
        this.ctx.modifyIdentifier(_size);
        this.ctx.modifyIdentifier(value);
      });
    }
    return this;
  }

  clear(): void {
    const size = this.set.size;
    this.set.clear();
    if (size !== this.set.size) {
      atomic(() => {
        this.ctx.modifyIdentifier(_size);
        this.ctx.modifyIdentifier(_has);
      });
    }
  }

  delete(value: T): boolean {
    const res = this.set.delete(value);
    if (res) {
      atomic(() => {
        this.ctx.modifyIdentifier(_size);
        this.ctx.modifyIdentifier(value);
      });
    }
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
    this.ctx.observeIdentifier(value);
    this.ctx.observeIdentifier(_has);
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

registerObservableClass(Set, {
  makeObservable: (ctx) => {
    return new ObservableSet(ctx);
  },
} satisfies ObservableFactory<Set<unknown>>);
