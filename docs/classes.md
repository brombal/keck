# Custom Classes

Plain objects, arrays, `Map`, and `Set` are observable out of the box. Any other class — domain models, ORM entities, view-models, third-party class instances — needs to be registered with Keck before its instances can be observed. This page covers how registration works, how methods, getters, and setters behave inside the proxy, and the rules for atomic and async writes.

This material applies equally to React and vanilla code.

## Registering a Class

Call `registerObservableClass()` once, at module load time, before you observe any instance of the class.

```ts
import { observe, registerObservableClass } from "keck";

class Counter {
  value = 0;

  increment() {
    this.value++;
  }
}

registerObservableClass(Counter);

const counter = observe(new Counter(), () => {
  console.log(counter.value);
});

counter.increment();
```

Registration uses the default object factory under the hood, so most classes "just work." Only register a class once. After registration, `observe(new MyClass())`, `useObserver(new MyClass())`, and nested instances inside other observables all behave as expected.

## Methods

A method on a registered class is invoked through the proxy and runs inside `atomic()`. Multiple writes inside one synchronous method call notify observers exactly once.

```ts
class Counter {
  value = 0;

  increment(by: number) {
    for (let i = 0; i < by; i++) this.value++;
  }
}

registerObservableClass(Counter);

const counter = observe(new Counter(), () => console.log("changed"));
counter.increment(5); // logs "changed" once, not five times
```

Methods that call other methods on the same instance are still atomic — `atomic()` is reentrant, so the outer call wraps everything that happens inside.

```ts
class Counter {
  value = 0;

  reset() {
    this.value = 0;
  }

  bumpThenReset() {
    this.value++;
    this.reset(); // still part of the same atomic call
  }
}
```

## Async Methods

Async methods are only atomic for the synchronous portion before the first `await`. Once the method suspends, `atomic()` has already flushed; writes that happen after each `await` notify observers individually.

```ts
class Counter {
  value = 0;

  async incrementSlowly(by: number) {
    for (let i = 0; i < by; i++) {
      await delay(100);
      this.value++; // fires observers once per iteration
    }
  }
}
```

If you want a single notification at the end of an async method, accumulate the work synchronously and apply it in one `atomic()` call after the awaits resolve.

```ts
async load(id: string) {
  const data = await fetch(`/api/items/${id}`).then((r) => r.json());

  atomic(() => {
    this.id = data.id;
    this.name = data.name;
    this.tags = data.tags;
  });
}
```

Treat `atomic()` itself as synchronous. Pass a sync callback only.

## Getters and Setters

Getter and setter properties work the same as plain fields. Reading a getter during a focused observation subscribes the observer to whatever observable values the getter reads internally. Writing to a setter goes through `atomic()` and fires observers exactly once for that assignment.

```ts
import { focus, observe, registerObservableClass } from "keck";

class PriceModel {
  subtotal = 0;
  taxRate = 0.08;

  get total() {
    return this.subtotal * (1 + this.taxRate);
  }

  set discount(amount: number) {
    this.subtotal -= amount;
  }
}

registerObservableClass(PriceModel);

const model = observe(new PriceModel(), () => console.log("model changed"));

focus(model);
void model.total; // observes subtotal and taxRate via the getter
focus(model, false);

model.taxRate = 0.1; // logs once — total depends on taxRate
model.discount = 5;  // logs once — the setter's write to subtotal is atomic
```

A getter that derives its result from observable state behaves like an inline `derive()`: the observer subscribes to exactly the leaves the getter touches, not to the getter's container property.

In React, the same applies — reading a getter during render subscribes the component to its underlying observable reads, and writing to a setter notifies all observers in one batch.

## Custom Factories

For classes whose state lives somewhere unusual — a private store, a `WeakMap`, an external library — you can supply a custom factory as the second argument to `registerObservableClass()`. This is rarely needed; the default factory handles any class whose state is in regular instance properties. See the [API reference](api.md#registerobservableclass) for the factory contract.
