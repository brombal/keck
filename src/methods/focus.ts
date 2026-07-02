import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observation, Observer, StaleObservations } from 'keck/core/Observer';
import type { Observable } from 'keck/core/RootNode';
import { triggerObservations } from 'keck/core/triggerObservations';
import { atomicObservations, recordAtomicSource } from 'keck/methods/atomic';

export interface FocusTransaction {
  commit: () => void;
  discard: () => void;
}

/**
 * Tracks the discard function for each observer that currently has an active focus session.
 * When a new session starts for the same observer, the prior one is settled first.
 */
const activeDiscards = new WeakMap<Observer, () => void>();

/**
 * Begins a focus session on a focusable observable. Returns `{ commit, discard }` that are
 * idempotent and close over their own pending observation Set.
 *
 * During the session, property reads on the observable are recorded. On `commit()`, those
 * observations become active and will trigger the observer's callback when modified. On
 * `discard()`, the session is abandoned and prior observations are restored.
 *
 * Writes made by *other* observers during the session to properties the session (or, for
 * discard, a prior committed session) has observed are not lost: they are recorded as stale and
 * the observer's callback is triggered when the session settles.
 *
 * A microtask is queued to auto-discard if neither `commit` nor `discard` is called before
 * the end of the current event cycle — covering abandoned renders (Suspense, concurrent
 * bail-outs) without requiring the caller to handle cleanup explicitly.
 *
 * If a prior session for the same observer is still active when this is called, it is
 * discarded before the new session begins.
 *
 * Throws if called on a non-focusable observer.
 */
export function focus(observable: object): FocusTransaction {
  const observer = ObservableContext.getForObservable(observable as Observable).observer;

  if (!observer.isFocusable) {
    throw new Error(
      'focus() can only be called on a focusable observer (created with { focusable: true })',
    );
  }

  // Settle any prior active session before starting a new one
  activeDiscards.get(observer)?.();

  // The pending Set is owned by this closure. The observer borrows a reference during the
  // session so that addObservation() routes reads here instead of _validObservations.
  const pending = new Set<Observation>();
  observer.beginCapture(pending);

  let settled = false;

  const discard = () => {
    if (settled) return;
    settled = true;
    const stale = observer.discardCapture();
    activeDiscards.delete(observer);
    triggerStaleObservations(stale);
  };

  const commit = () => {
    if (settled) return;
    settled = true;
    const stale = observer.commitCapture(pending);
    activeDiscards.delete(observer);
    triggerStaleObservations(stale);
  };

  activeDiscards.set(observer, discard);
  queueMicrotask(discard);

  return { commit, discard };
}

/**
 * Triggers the observer callbacks for observations that were written to (by other observers)
 * during the session. Mirrors RootNode.modifyPath's handling of an active `atomic()` batch:
 * if one exists, the observations join the batch and fire when it completes.
 */
function triggerStaleObservations(stale: StaleObservations | undefined) {
  if (!stale) return;
  if (atomicObservations) {
    for (const observation of stale.observations) atomicObservations.add(observation);
    recordAtomicSource(stale.sourceName);
  } else {
    triggerObservations(stale.observations, { sourceName: stale.sourceName });
  }
}
