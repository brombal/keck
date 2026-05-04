# Mutability in Keck

If you've been writing React for a while, you've internalized the rule: *don't mutate state*. That instinct is correct.
But the rule is solving a specific problem — and Keck solves the same problem a different way.

## Why the rule exists

React's rendering model needs to answer one question cheaply: *did something change?* The standard answer is
**reference equality**: if the object reference is different, something changed; if it's the same, nothing did.

This is why `useState` works the way it does. When you call `setState(newValue)`, React compares `newValue` to the
previous value by reference. If you mutate the existing object and pass it back in — `obj.name = "Ada"; setState(obj)`
— React sees the same reference and skips the re-render. The mutation happened; React just didn't see it.

Immutability is the convention that keeps those references honest: every change produces a new object, so changed
data always means a new reference.

## The cost of that convention

Immutability works, but it moves a real burden onto the developer.

**Structural updates are verbose.** To change a single nested field, you recreate the entire path:

```ts
setState({
  ...state,
  user: {
    ...state.user,
    profile: {
      ...state.user.profile,
      name: "Ada",
    },
  },
});
```

Immer reduces the syntax, but it doesn't remove the concept — you're still operating within an immutability model,
just with a more convenient surface.

**Reference discipline is easy to get wrong.** For a re-render to happen, the reference must change at every level of
the tree above the changed value. Miss a level and the component silently fails to update. This is one of the most
common sources of subtle bugs in React applications.

**Fine-grained subscriptions require manual work.** Because change detection is reference-based, "did `user.name`
change?" is not a question React can answer on its own. Libraries like Redux and Zustand address this with selectors —
functions you write that extract the specific slice of state a component depends on. If you don't write them carefully,
components re-render more than they need to.

## How Keck changes the equation

Keck replaces reference equality with **proxy intercepts**. Instead of inferring that something changed from a new
reference, Keck observes every read and write directly.

When a component renders, Keck records exactly which properties it accessed. When you later mutate through the proxy,
Keck knows precisely what changed and notifies only the components that read those specific values. There is no
reference comparison, no structural update discipline, and no selectors to write.

The proxy is what makes mutation safe. Writing `state.user.name = "Ada"` through the proxy is not unsafe mutation —
it is a fully tracked write. Every observer of `user.name` will be notified; every observer of everything else will
not.

What is unsafe — and what Keck cannot track — is writing to the raw underlying object directly:

```ts
const raw = { name: "Ada" };
const state = observe(raw);

raw.name = "Byron"; // Keck does not see this; observers are not notified
state.name = "Byron"; // Keck sees this; observers are notified
```

This is a simpler invariant to hold than full immutability discipline: **always write through the proxy, never through
the raw object**. If you follow that rule, Keck handles everything else.

## Encapsulation still works

A common concern: if you can mutate state from anywhere, how do you enforce update logic or prevent invalid states?

You don't have to choose between mutation and encapsulation. Regular setter methods and class methods work exactly as
expected:

```ts
class CartStore {
  items: Array<{ id: string; price: number }> = [];

  addItem(item: { id: string; price: number }) {
    if (this.items.some((i) => i.id === item.id)) return;
    this.items.push(item);
  }
}
```

Keck observes the class instance through a proxy — calls to `addItem` are tracked like any other write. You can put
as much or as little logic around state updates as your application requires. See the [Custom Classes guide](classes.md)
for details.

## Keck's tradeoffs

Keck's approach has a few tradeoffs worth knowing about.

**Time-travel debugging** — Redux DevTools works because every state transition produces a new, storable object. With
Keck, state is a single mutable object; previous states are not automatically preserved. You can implement history
yourself with `observe()` callbacks, but it is not free the way it is with Redux.

**Mutation from anywhere** — Without enforced update mechanisms (like private fields with setters or class methods),
mutations can originate from any part of the codebase. For small applications this is fine, but larger applications or
teams will require their own conventions. Keck is not opinionated about this: you can decide what works for you, and
many standard, tried-and-tested programming approaches will work well.

**The proxy is not invisible** — Keck proxies behave like the original object in almost every case, but code that
inspects object identity or uses non-standard reflection can notice the difference. You just need to remember to use
`unwrap()` at API boundaries and when passing state to third-party libraries.
