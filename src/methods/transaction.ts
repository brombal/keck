import { ObservableContext } from 'keck/core/ObservableContext';
import type { Observation, Observer } from 'keck/core/Observer';
import type { Observable } from 'keck/core/RootNode';

export interface Transaction {
  commit: () => void;
  discard: () => void;
}

/**
 * Tracks the discard function for each observer that currently has an active transaction.
 * When a new transaction starts for the same observer, the prior one is settled first.
 */
const activeDiscards = new WeakMap<Observer, () => void>();

/**
 * Begins a transaction on the observable. Returns `{ commit, discard }` that are idempotent
 * and close over their own pending observation Set.
 *
 * A microtask is queued to auto-discard if neither `commit` nor `discard` is called before
 * the end of the current event cycle — covering abandoned renders (Suspense, concurrent
 * bail-outs) without requiring the caller to handle cleanup explicitly.
 *
 * If a prior transaction for the same observer is still active when this is called, it is
 * discarded before the new transaction begins.
 */
export function beginTransaction(observable: object): Transaction {
  const observer = ObservableContext.getForObservable(observable as Observable).observer;

  // Settle any prior active transaction before starting a new one
  activeDiscards.get(observer)?.();

  // The pending Set is owned by this closure. The observer borrows a reference during the
  // transaction so that addObservation() routes reads here instead of _validObservations.
  const pending = new Set<Observation>();
  observer.beginTransaction(pending);

  let settled = false;

  const discard = () => {
    if (settled) return;
    settled = true;
    observer.discardTransaction();
    activeDiscards.delete(observer);
  };

  const commit = () => {
    if (settled) return;
    settled = true;
    observer.commitTransaction(pending);
    activeDiscards.delete(observer);
  };

  activeDiscards.set(observer, discard);
  queueMicrotask(discard);

  return { commit, discard };
}
