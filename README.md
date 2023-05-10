<img src="logo.svg" alt="Keck">
<br>
<br>

Keck is a utility for creating observable objects in React and vanilla JS.

```jsx
import { useObservable } from 'keck';

const { store } = createObserver({ count: 0 }, ({ count }) => {
  console.log(count);
});

function Counter() {
  const { count } = useObservable({ count: 0 });

  return (
    <div>
      <button onClick={() => store.count--}>-</button>
      <span>{count}</span>
      <button onClick={() => store.count++}>+</button>
    </div>
  );
}
```


```shell
npm install keck
# or
yarn add keck
```

- TypeScript support
- React hooks support
- No dependencies
- Tiny (1.6KB gzipped)
- 100% test coverage
- Works in all browsers that support [Proxy](https://caniuse.com/?search=Proxy)

---

- Installation
- tl;dr usage
- Guide
  - React
  - Vanilla JS
  - TypeScript support
- API
  - useObservable `function useObservable<T extends object>(data: T): T`
  - createObserver
    `function createObserver<T extends object>(data: T, callback: Callback): ObserverResponse<T>`
  - unwrap
  - observableFactories
  - Types
    - ObservableContext
    - Callback
    - ObserverResponse<T>
- Contributing
- License
