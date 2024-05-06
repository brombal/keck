import { ObservableContext } from "#keck/core/ObservableContext";
import { getObservableFactory } from "#keck/factories/observableFactories";
import { atomicObservations } from "#keck/methods/atomic";
import { type DeriveContext, activeDeriveCtx, invokeDeriveCtx } from "#keck/methods/derive";
import { isPeeking } from "#keck/methods/peek";
import { isRef } from "#keck/methods/ref";
import { silentMode } from "#keck/methods/silent";
import { PathMap } from "#keck/util/PathMap";
import { getMapEntry } from "#keck/util/getMapEntry";

import { type Observation, type Observer, isObservable } from "./Observer";

/**
 * Branded type for a plain value that can be observed. Used to differentiate in usage from an
 * Observable.
 */
export type Value = object & { __value: true };

/**
 * Branded type for an observable object proxy or subclass. Used to differentiate in usage from a
 * Value.
 */
export type Observable = object & { __observable: true };

/**
 * An array of values used to identify the "path" to a value in an observable object graph.
 */
export type Path = any[];

interface ObservablePathEntry {
  /**
   * Used to look up an existing ObservableContext for an Observer at the given path,
   * and to invalidate all ObservableContexts for an Observer at a given path.
   *
   * TODO should there be a separate WeakMap for Observables? It might be more performant to
   *  only invalidate Observables but leave their ObservableContexts intact and reuse them by
   *  reassigning an Observable when it is recreated.
   */
  observables: WeakMap<Observer, ObservableContext<any>>;
  observations: Map<Observer, Observation>; // to look up observations
}

export class RootNode {
  pathEntries = new PathMap<ObservablePathEntry>();

  static rootNodeForValue = new WeakMap<Value, RootNode>();

  static getForValue(value: Value) {
    isObservable(value, true);
    return getMapEntry(RootNode.rootNodeForValue, value, () => new RootNode());
  }

  private constructor() {}

  observePath(observer: Observer, path: Path, childValue: Value, force = false) {
    let returnValue = childValue;

    if (isPeeking()) return returnValue;

    const isObservable =
      childValue &&
      typeof childValue === "object" &&
      getObservableFactory(childValue.constructor) &&
      !isRef(childValue);

    // If the given value is observable, return the observable for it
    if (isObservable) {
      returnValue = this.getObservable(observer, path, childValue) as any as Value;
    }

    if (force || activeDeriveCtx || (!isObservable && observer.isFocusing)) {
      this.createObservation(observer, path);
    }

    return returnValue;
  }

  modifyPath(path: Path) {
    // Invalidate observables for this and all parent paths
    // TODO probably need to modify path for all descendants as well
    //  const x = { a: { b: { c: { d: 1 } } } }
    //  x.a.b = { c: { e: 1 } }
    //  then make sure accessing x.a.b.c gives correct value
    const ancestors = this.pathEntries.collect(path, "ancestors");
    for (const pathEntry of ancestors) {
      pathEntry.observables = new WeakMap();
    }

    if (silentMode) return;

    let observationsToCall = atomicObservations || new Set();

    const pathEntries = this.pathEntries.collect(path);

    for (const pathEntry of pathEntries) {
      for (const observation of pathEntry.observations.values()) {
        if (!observation.observer.enabled) continue;

        // If the Observation is not valid, remove it from the map
        // (it could have been cleared out by resetting the observer)
        if (!observation.observer.hasObservation(observation)) {
          pathEntry.observations.delete(observation.observer);
          continue;
        }

        observationsToCall.add(observation);
      }
    }

    // If atomicObservers is set, then `atomic()` will handle calling the observers
    if (observationsToCall !== atomicObservations) {
      RootNode.triggerObservations(observationsToCall);
    }
  }

  getObservable(observer: Observer, path: Path, childValue: Value) {
    isObservable(childValue, true);

    return getMapEntry(
      this.getPathEntry(path).observables,
      observer,
      () => new ObservableContext(this, observer, childValue, path),
    ).observable;
  }

  private getPathEntry(path: Path) {
    return getMapEntry(
      this.pathEntries,
      path,
      () => ({ observables: new WeakMap(), observations: new Map() }) satisfies ObservablePathEntry,
    );
  }

  createObservation(observer: Observer, path: Path) {
    const pathEntry = this.getPathEntry(path);
    const getObservationMeta = { created: false };
    const observation = getMapEntry(
      pathEntry.observations,
      observer,
      () => ({ observer, path }),
      getObservationMeta,
    );

    // If there's no activeDeriveFn, then clear the set (the observation is unconditional)
    if (!activeDeriveCtx) {
      observation.deriveCtxs = undefined;
    }
    // If there's an activeDeriveFn, and we just created the observation or there is an existing Set of deriveCtxs, add it to the Set.
    // Otherwise, there is already an unconditional observation and we shouldn't add this derive fn.
    else if (getObservationMeta.created || observation.deriveCtxs) {
      observation.deriveCtxs = observation.deriveCtxs || new Set();
      observation.deriveCtxs.add(activeDeriveCtx);
    }

    observer.addObservation(observation);
  }

  static triggerObservations(observations: Set<Observation>) {
    // The Set of Observers to trigger (prevents triggering the same observer multiple times)
    const triggerObservers = new Set<Observer>();

    // Map of validated DeriveContexts and whether their return values changed
    // (prevents redundant invocations of derive fn or isEqual)
    const verifiedDeriveCtxs = new Map<DeriveContext<any>, boolean>();

    for (const observation of observations) {
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
          const nextResult = invokeDeriveCtx(deriveCtx);
          const changedResult = deriveCtx.isEqual
            ? !deriveCtx.isEqual(prevResult, nextResult)
            : prevResult !== nextResult;

          verifiedDeriveCtxs.set(deriveCtx, changedResult);

          // If the result changed, this observer will be invoked
          if (changedResult) skipObserver = false;
        }
      }

      if (!skipObserver) triggerObservers.add(observation.observer);
    }

    for (const observer of triggerObservers) {
      observer.callback?.();
    }
  }
}
