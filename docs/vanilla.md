# Vanilla TypeScript Guide

Keck is React-first. Most of the time, `useObserver` inside a component is the right entry point.

This guide covers the cases where you need observable state outside a component tree — workers, CLI tools, integration code, custom hooks built on top of `observe()`, or shared module-level state that components subscribe to.

For concepts that apply equally in React and vanilla code — derived values, deep tracking, batching, custom classes, getters and setters — see the [Mental Model](mental-model.md), the [Custom Classes guide](classes.md), and the [API reference](api.md).

## Imperative Observers

`observe(data, callback)` returns a writable proxy and runs `callback` on any change to the underlying data.

```ts
import { observe } from "keck";

const store = observe(
  { count: 0 },
  () => {
    console.log("Changed");
  },
);

store.count++;
```

In unfocused mode (the default), the callback fires for any real change to the data. Use this when you want a callback to run on every mutation.

## Observable Without a Callback

`observe()` accepts an object alone, with no callback. The result is a writable proxy that broadcasts writes to every other observer of the same underlying data, but does not run a callback of its own.

```ts
import { observe } from "keck";

export const store = observe({
  signedIn: false,
  userId: null as string | null,
});
```

This is the standard shape for shared module-level state. Components subscribe via `useObserver(store)`; other modules can subscribe via `observe(store, callback)`. Writes through `store` — or any other proxy for the same underlying data — reach every subscriber. Writes to the original raw object do not.

Helpers that write through property assignment, such as `transformInPlace()`, also require a Keck proxy as their target, so the no-callback form is the right fit for module-level state that those helpers will mutate.

## Focused Observers

By default, an `observe()` callback fires for any change. Pass `{ focusable: true, onChange }` to create a focusable observer that only tracks properties read during a `focus()` session.

```ts
import { focus, observe } from "keck";

const cart = observe(
  {
    items: [] as Array<{ id: string; price: number }>,
    couponCode: "",
  },
  {
    focusable: true,
    onChange: () => console.log("Observed cart value changed"),
  },
);

const session = focus(cart);
void cart.items.length;
session.commit();

cart.couponCode = "SAVE10"; // no callback — couponCode wasn't focused
cart.items.push({ id: "sku_1", price: 24 }); // callback fires
```

React observers use focused tracking automatically during render — `focus()` is a manual control for the vanilla case.

## Derived Observers

`observe()` accepts a `derive` function so the callback runs only when a derived result changes.

```ts
import { observe } from "keck";

const session = observe(
  { user: null as null | { id: string; role: "admin" | "member" } },
  {
    derive: (state) => state.user?.role === "admin",
    onChange: () => {
      console.log("Admin status changed");
    },
  },
);

session.user = { id: "user_1", role: "member" }; // no callback — result still false
session.user = { id: "user_2", role: "member" }; // no callback — result still false
session.user = { id: "user_3", role: "admin" };  // callback fires — result changed to true
```

This is the vanilla equivalent of `useObserver(data, { derive, onChange })`.

Inside the derive function, every read subscribes, and object reference reads subscribe **deeply**. Watching a whole
subtree is therefore just returning it:

```ts
import { observe, unwrap } from "keck";

const table = observe(
  { filter: { name: "", active: true }, page: 0 },
  {
    derive: (state) => state.filter,
    onChange: (filter) => refetch(unwrap(filter)),
  },
);

table.filter.name = "abc"; // fires — the filter subtree changed
table.page = 2;            // no callback — outside the derived subtree
```

This works because a proxy's identity is stable until something inside it mutates: `state.filter` returns a new proxy
after any nested change (including `Set`/`Map` contents), so the default strict-equality comparison detects exactly
subtree changes — writes of identical values do not fire. `onChange` receives that (new) proxy — `unwrap()` it before
cloning or serializing (`structuredClone` throws on proxies).

Like any `observe()` callback observer, a derived observer is held strongly by its observed data: it lives (and fires)
for as long as the data is reachable. Call `unobserve()` on the proxy to stop it sooner. An observer whose data is
created and dropped together with it (a factory observing its own private state) needs no cleanup — the group is
garbage-collected together.

## Observer Lifecycle

`reset()`, `disable()`, and `enable()` are most useful for long-lived imperative observers.

```ts
import { disable, enable, focus, observe, reset } from "keck";

const cart = observe(
  { items: [] as string[], couponCode: "" },
  { focusable: true, onChange: () => console.log("changed") },
);

const session = focus(cart);
void cart.items.length; // focused
session.commit();

reset(cart); // clears the focused observation on items.length

cart.items.push("sku_1"); // no callback — the observation was cleared
```

`disable(observer)` pauses callbacks until `enable(observer)` resumes them. Both retain the observer's accumulated observations.

`reset(observer)` clears all of a focusable observer's observations so the next focus session starts fresh. It is meaningful only on focusable observers; non-focusable observers fire on every change regardless of what was read, so `reset()` has no observable effect.

## Batching and Silent Writes

Two utilities you'll reach for in vanilla code more often than in React:

```ts
import { atomic, observe, silent } from "keck";

const account = observe({ firstName: "", lastName: "" }, () => console.log("changed"));

atomic(() => {
  account.firstName = "Ada";
  account.lastName = "Lovelace";
}); // one callback for the whole block

silent(() => {
  account.firstName = "Augusta"; // no callback
});
```

See [`atomic`](api.md#atomic) and [`silent`](api.md#silent) for the full mechanics.
