# Getting Started

Keck lets you use normal mutable objects as observable state. The React hook is the easiest place to start.

```bash
npm install keck
```

```tsx
import { useObserver } from "keck/react";

export function Counter() {
  const state = useObserver({ count: 0 });

  return (
    <button type="button" onClick={() => state.count++}>
      Count: {state.count}
    </button>
  );
}
```

The object passed to `useObserver()` is wrapped in a proxy. Reads during render are tracked. Writes through the proxy
notify the matching observers.

## Local State

Inline objects are treated as initial values. Keck keeps the same observed object for the lifetime of the component.

```tsx
import { useObserver } from "keck/react";

export function SignupForm() {
  const form = useObserver({
    name: "",
    email: "",
    acceptedTerms: false,
  });

  const canSubmit = form.name.trim() !== "" && form.email.includes("@") && form.acceptedTerms;

  return (
    <form>
      <input value={form.name} onChange={(event) => (form.name = event.target.value)} />
      <input value={form.email} onChange={(event) => (form.email = event.target.value)} />

      <label>
        <input
          type="checkbox"
          checked={form.acceptedTerms}
          onChange={(event) => (form.acceptedTerms = event.target.checked)}
        />
        Accept terms
      </label>

      <button type="submit" disabled={!canSubmit}>
        Create account
      </button>
    </form>
  );
}
```

## Shared State

Shared state is just a shared object. Components can observe the same object and still re-render independently.

```ts
// accountStore.ts
export const accountStore = {
  session: {
    signedIn: false,
    userId: null as string | null,
  },
  profile: {
    name: "",
    email: "",
  },
};
```

```tsx
// Header.tsx
import { useObserver } from "keck/react";
import { accountStore } from "./accountStore";

export function Header() {
  const account = useObserver(accountStore);

  return <span>{account.session.signedIn ? account.profile.name : "Guest"}</span>;
}
```

```tsx
// ProfileEditor.tsx
import { useObserver } from "keck/react";
import { accountStore } from "./accountStore";

export function ProfileEditor() {
  const account = useObserver(accountStore);

  return (
    <section>
      <input value={account.profile.name} onChange={(event) => (account.profile.name = event.target.value)} />
      <input value={account.profile.email} onChange={(event) => (account.profile.email = event.target.value)} />
    </section>
  );
}
```

The header reads `session.signedIn` and sometimes `profile.name`. It will not re-render when `profile.email` changes.

## Derived Values

Use `derive()` when your UI cares about a computed result.

```tsx
import { derive } from "keck";
import { useObserver } from "keck/react";

const cartStore = {
  items: [] as Array<{ id: string; price: number; quantity: number }>,
};

export function CartSummary() {
  const cart = useObserver(cartStore);

  const subtotal = derive(() => {
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  });

  return <strong>${subtotal.toFixed(2)}</strong>;
}
```

## Effects and API Boundaries

Use `deep()` when an effect should run after any nested change to an object. Use `unwrap()` before handing observable
data to APIs or third-party libraries.

```tsx
import { deep, unwrap } from "keck";
import { useObserver } from "keck/react";
import { useEffect } from "react";
import { accountStore } from "./accountStore";

export function SaveProfile() {
  const account = useObserver(accountStore);

  useEffect(() => {
    localStorage.setItem("profile", JSON.stringify(unwrap(account.profile)));
  }, [deep(account.profile)]);

  return null;
}
```

## Rules of Thumb

- Read during render to subscribe a component to that property.
- Write through the observed proxy, not the raw object.
- Each component should call `useObserver()` for itself.
- Use `derive()` for computed results.
- Use `deep()` when any nested change should re-run effects or recompute memoized values that depend on the object.
- Use `unwrap()` at API and library boundaries.
