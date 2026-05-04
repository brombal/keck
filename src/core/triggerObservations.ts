import { reportError } from 'keck/core/config';
import type { Observation, Observer, ObserverCallbackContext } from 'keck/core/Observer';
import { type DeriveContext, invokeDeriveCtx } from 'keck/methods/derive';

export function triggerObservations(
  observations: Set<Observation>,
  context: ObserverCallbackContext,
) {
  while (observations.size > 0) {
    // The Set of Observers to trigger (prevents triggering the same observer multiple times)
    const triggerObservers = new Set<Observer>();

    // Map of validated DeriveContexts and whether their return values changed
    // (prevents redundant invocations of derive fn or isEqual)
    const verifiedDeriveCtxs = new Map<DeriveContext<any>, boolean>();

    for (const observation of observations) {
      observations.delete(observation);

      // By default, we don't skip any Observer callback (for non-focused Observers)
      let skipObserver = false;

      // If the observation has derive contexts, validate each one
      if (observation.deriveCtxs) {
        // In this case, we skip the observer by default unless one of the derived return values changed
        skipObserver = true;

        for (const deriveCtx of observation.deriveCtxs) {
          // Already checked; skip and use same result
          if (verifiedDeriveCtxs.has(deriveCtx)) {
            const changedResult = verifiedDeriveCtxs.get(deriveCtx);
            if (changedResult) skipObserver = false;
            continue;
          }

          // Get next result and compare with previous result
          const prevResult = deriveCtx.prevResult;
          let nextResult: unknown;
          let changedResult: boolean;
          try {
            nextResult = invokeDeriveCtx(deriveCtx);
            changedResult = deriveCtx.isEqual
              ? !deriveCtx.isEqual(prevResult, nextResult)
              : prevResult !== nextResult;
          } catch (e) {
            reportError(e);
            // Treat a throwing derive as "changed" — safer to over-notify than silently suppress
            changedResult = true;
          }

          verifiedDeriveCtxs.set(deriveCtx, changedResult);

          // If the result changed, this observer will be invoked
          if (changedResult) skipObserver = false;
        }
      }

      if (!skipObserver) triggerObservers.add(observation.observer);
    }

    for (const observer of triggerObservers) {
      try {
        observer.callback?.(context);
      } catch (e) {
        reportError(e);
      }
    }
  }
}
