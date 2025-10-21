declare global {
  var keckFinalizationRegistry: FinalizationRegistry<any> | undefined;
}

export function initGarbageCollectionObservation(cb: (heldValue: any) => void) {
  /* istanbul ignore next */
  if (window.FinalizationRegistry && !globalThis.keckFinalizationRegistry) {
    globalThis.keckFinalizationRegistry = new FinalizationRegistry(cb);
  }
}
