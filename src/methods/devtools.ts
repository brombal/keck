import type { ObserverCallbackContext } from 'keck/core/Observer';
import { transformInPlace } from 'keck/util/transformInPlace';
import { observe } from './observe';
import { reset } from './reset';
import { unwrap } from './unwrap';

export interface DevToolsOptions {
  name?: string;
}

interface ReduxDevToolsExtension {
  connect(options: { name: string }): ReduxDevToolsInstance;
}

interface ReduxDevToolsInstance {
  init(state: unknown): void;
  send(action: { type: string }, state: unknown): void;
  subscribe(listener: (message: ReduxDevToolsMessage) => void): () => void;
}

interface ReduxDevToolsMessage {
  type: string;
  payload: { type: string };
  state: string;
}

export function connectDevTools<T extends object>(store: T, options?: DevToolsOptions): () => void {
  const ext: ReduxDevToolsExtension | undefined = (globalThis as any).__REDUX_DEVTOOLS_EXTENSION__;
  if (!ext) return () => {};

  const raw = unwrap(store) as T;
  const devtools = ext.connect({ name: options?.name ?? 'Keck Store' });

  devtools.init(JSON.parse(JSON.stringify(raw)));

  let suppressNotification = false;

  const proxy = observe(raw, (ctx: ObserverCallbackContext) => {
    if (suppressNotification) return;
    const type =
      ctx.actionName && ctx.sourceName
        ? `${ctx.actionName} (${ctx.sourceName})`
        : (ctx.actionName ?? ctx.sourceName ?? '@@keck/mutation');
    devtools.send({ type }, JSON.parse(JSON.stringify(unwrap(store))));
  });

  const unsubscribe = devtools.subscribe((message) => {
    if (message.type === 'DISPATCH' && message.payload.type === 'JUMP_TO_ACTION') {
      suppressNotification = true;
      transformInPlace(proxy, JSON.parse(message.state));
      suppressNotification = false;
    }
  });

  return () => {
    unsubscribe();
    reset(proxy);
  };
}
