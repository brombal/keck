# Recipes

These examples are intentionally small, but they use the same patterns you would use in an application.

## Shopping Cart

```ts
// cartStore.ts
export const cartStore = {
  items: [] as Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>,
  ui: {
    open: false,
  },
};
```

```tsx
// AddToCartButton.tsx
import { useObserver } from "keck/react";
import { cartStore } from "./cartStore";

export function AddToCartButton(props: {
  product: { id: string; name: string; price: number };
}) {
  const cart = useObserver(cartStore);

  return (
    <button
      type="button"
      onClick={() => {
        const existing = cart.items.find((item) => item.id === props.product.id);

        if (existing) {
          existing.quantity++;
          return;
        }

        cart.items.push({ ...props.product, quantity: 1 });
      }}
    >
      Add to cart
    </button>
  );
}
```

```tsx
// CartSummary.tsx
import { derive } from "keck";
import { useObserver } from "keck/react";
import { cartStore } from "./cartStore";

export function CartSummary() {
  const cart = useObserver(cartStore);
  const count = derive(() => cart.items.reduce((sum, item) => sum + item.quantity, 0));
  const subtotal = derive(() => cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

  return (
    <button type="button" onClick={() => (cart.ui.open = true)}>
      Cart ({count}) - ${subtotal.toFixed(2)}
    </button>
  );
}
```

## Autosaving Account Settings

```tsx
import { deep, unwrap } from "keck";
import { useObserver } from "keck/react";
import { useEffect } from "react";

const accountStore = {
  profile: {
    name: "",
    email: "",
  },
  preferences: {
    newsletter: false,
    theme: "system",
  },
};

export function AccountSettings() {
  const account = useObserver(accountStore);

  useEffect(() => {
    localStorage.setItem("account-settings", JSON.stringify(unwrap(account)));
  }, [deep(account)]);

  return (
    <form>
      <input value={account.profile.name} onChange={(event) => (account.profile.name = event.target.value)} />
      <input value={account.profile.email} onChange={(event) => (account.profile.email = event.target.value)} />

      <label>
        <input
          type="checkbox"
          checked={account.preferences.newsletter}
          onChange={(event) => (account.preferences.newsletter = event.target.checked)}
        />
        Newsletter
      </label>
    </form>
  );
}
```

## Persisting with a Synchronous Callback

Use the callback overload when persistence must happen in the same turn as the write.

```tsx
import { unwrap } from "keck";
import { useObserver } from "keck/react";

const settingsStore = {
  sidebarOpen: true,
  density: "comfortable",
};

export function SettingsPersistence() {
  useObserver(
    settingsStore,
    () => {
      localStorage.setItem("settings", JSON.stringify(unwrap(settingsStore)));
    },
    [],
  );

  return null;
}
```

## Replacing Server Data in Place

`transformInPlace()` replaces the contents of an object without replacing the top-level reference. Use it when several
components share an object and you want them all to see new data.

```ts
import { observe, transformInPlace } from "keck";

export const form = observe({
  id: "",
  name: "",
  tags: [] as string[],
});

async function loadForm(id: string) {
  const next = await fetch(`/api/forms/${id}`).then((response) => response.json());
  transformInPlace(form, next);
}
```

Pass a Keck proxy (the result of `observe()` or any nested observable) as the target. `transformInPlace()` writes via
direct property assignment, so those writes only notify observers when they flow through a proxy. A raw object target
will be transformed correctly but observers will not re-render until something else triggers them.

## Optimistic API Updates

Use `unwrap()` before sending observable data across the network.

```ts
import { unwrap } from "keck";

async function saveCart(cart: { items: Array<{ id: string; quantity: number }> }) {
  await fetch("/api/cart", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(unwrap(cart)),
  });
}
```

## Reading without Subscribing

Use `peek()` to read a value during render without subscribing to it. This is useful when you need a value right now
but do not need the component to re-render when it changes.

```tsx
import { peek } from "keck";
import { useObserver } from "keck/react";

const cartStore = {
  items: [] as Array<{ id: string; name: string; price: number; quantity: number }>,
  checkoutSessionId: "",
};

export function CartLineItems() {
  const cart = useObserver(cartStore);

  // checkoutSessionId is written once when checkout starts and treated as immutable.
  // Subscribing to it would cause unnecessary re-renders — peek it instead.
  const sessionId = peek(() => cart.checkoutSessionId);

  return (
    <form action={`/checkout/${sessionId}`}>
      {cart.items.map((item) => (
        <div key={item.id}>
          {item.name} × {item.quantity}
        </div>
      ))}
    </form>
  );
}
```

This component re-renders when `items` changes but not when `checkoutSessionId` changes. `peek()` is also useful
inside `derive()` functions when a value should inform the computation but not make the derived result reactive to
that value's changes.
