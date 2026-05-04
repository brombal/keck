# Redux DevTools Integration

Keck can connect to the [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools) for time-travel debugging and mutation inspection. This is an optional add-on — nothing imports it automatically.

## Setup

```ts
import { connectDevTools } from "keck";
import { store } from "./store";

connectDevTools(store, { name: "My Store" });
```

Call `connectDevTools` once, at app startup or in the module where your store is defined. The `name` option controls what label appears in the DevTools panel. If the extension is not installed, `connectDevTools` is a no-op.

`connectDevTools` returns a disconnect function if you need to tear it down:

```ts
const disconnect = connectDevTools(store);
// ...
disconnect();
```

## What You'll See

Every mutation to your store appears as an action in the DevTools panel. By default, actions are labeled `@@keck/mutation`.

You can make the log more readable in two ways.

### Named proxies

`sourceName` identifies the **proxy through which the write happened** — not the component that triggered the interaction. If a component writes through a module-level store named `'AppStore'`, the action will be labeled `AppStore` regardless of which component's button was clicked.

Pass a `name` to `observe()` and it will appear as the action source when that proxy writes:

```ts
import { observe } from "keck";

export const store = observe(
  { cart: { items: [] as string[] } },
  { name: "CartStore" },
);
```

When any code writes through this proxy, the action is labeled `CartStore` in DevTools.

To see component names in the log, write through the proxy returned by `useObserver` rather than the module-level store:

```tsx
function Counter() {
  const state = useObserver(store); // state's observer is named 'Counter'
  return <button onClick={() => state.count++}>{state.count}</button>;
  //                              ↑ writes through Counter's proxy → 'Counter' in DevTools
}
```

If instead you write `store.count++`, the action is labeled with the store's name, not the component's.

### Named atomics

Wrap a logical group of writes in `atomic("actionName", fn)` and Keck uses that name as the action label:

```ts
import { atomic } from "keck";
import { store } from "./store";

function addToCart(item: string) {
  atomic("addToCart", () => {
    store.cart.items.push(item);
    store.cart.count++;
  });
}
```

When both a named atomic and a named proxy are involved, Keck combines them: `addToCart (CartStore)`. This way you can see both what logical operation ran and which module or component triggered it.

## Time-Travel

The Redux DevTools panel lets you jump to any previous state. When you do, Keck applies that snapshot to your store using `transformInPlace`, so all components observing the store re-render with the restored state. Keck suppresses its own devtools notification during the restore to keep the action log clean.

## Multiple Stores

Call `connectDevTools` once per store, with distinct names:

```ts
connectDevTools(cartStore, { name: "Cart" });
connectDevTools(userStore, { name: "User" });
```

Each connection appears as a separate instance in the DevTools extension.

## Limitations

- `connectDevTools` uses `JSON.parse` / `JSON.stringify` for state snapshots. Values that are not JSON-serializable (functions, `undefined`, `Date`, `Map`, `Set`, circular references) will not round-trip correctly.
- Time-travel restores state structurally. Any class instances in your store will become plain objects after a time-travel jump.
- This integration is intentionally minimal. It is designed for development inspection, not as a full Redux replacement.
