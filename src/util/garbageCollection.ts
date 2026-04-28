const gcCallbacks = new Set<(heldValue: any) => void>();
let registry: FinalizationRegistry<string> | undefined;

export function initGarbageCollectionObservation(cb: (heldValue: any) => void): () => void {
  gcCallbacks.add(cb);
  if (!registry && typeof FinalizationRegistry !== 'undefined') {
    registry = new FinalizationRegistry((heldValue) => {
      for (const cb of gcCallbacks) cb(heldValue);
    });
  }
  return () => {
    gcCallbacks.delete(cb);
    if (gcCallbacks.size === 0) registry = undefined;
  };
}

export function registerObservableFinalizer(state: object): void {
  registry?.register(state, 'Keck observable released');
}
