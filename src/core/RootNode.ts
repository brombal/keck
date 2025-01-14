import { ObservableContext } from 'keck/core/ObservableContext';
import { getObservableFactory } from 'keck/factories/observableFactories';
import { atomicObservations } from 'keck/methods/atomic';
import { activeDeriveCtx } from 'keck/methods/derive';
import { isPeeking } from 'keck/methods/peek';
import { isRef } from 'keck/methods/ref';
import { silentMode } from 'keck/methods/silent';
import { PathMap } from 'keck/util/PathMap';
import { getMapEntry } from 'keck/util/getMapEntry';

import { isObservable } from 'keck/core/IsObservable';
import { triggerObservations } from 'keck/core/triggerObservations';
import type { AnyConstructor } from 'keck/util/types';
import type { Observation, Observer } from './Observer';

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
  observations: Map<Observer, Observation>; // to look up observations by Observer
}

export const rootNodeForValue = new WeakMap<Value, WeakRef<RootNode>>();

export function getRootNodeForValue(value: Value) {
  isObservable(value, true);
  return getMapEntry(
    rootNodeForValue,
    value,
    () => new WeakRef(new RootNode()),
    {},
    (ref) => !!ref.deref(),
  ).deref()!;
}

export class RootNode {
  pathEntries = new PathMap<ObservablePathEntry>();

  observePath(observer: Observer, path: Path, childValue: Value, force = false) {
    let returnValue = childValue;

    if (isPeeking()) return returnValue;

    const isObservable =
      childValue &&
      typeof childValue === 'object' &&
      getObservableFactory(childValue.constructor as AnyConstructor) &&
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
    // Invalidate observables for this and all related paths
    const ancestors = this.pathEntries.collect(path, 'all');
    for (const pathEntry of ancestors) {
      pathEntry.observables = new WeakMap();
    }

    if (silentMode) return;

    const observationsToCall = atomicObservations || new Set();

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
      triggerObservations(observationsToCall);
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
      (entry) => observer.hasObservation(entry),
    );

    // If there's no activeDeriveCtx, then clear the set (the observation is unconditional)
    if (!activeDeriveCtx) {
      observation.deriveCtxs = undefined;
    }
    // If there's an activeDeriveCtx, and we just created the observation or there is an existing Set of deriveCtxs, add it to the Set.
    // Otherwise, there is already an unconditional observation and we shouldn't add this derive fn.
    else if (getObservationMeta.created || observation.deriveCtxs) {
      observation.deriveCtxs = observation.deriveCtxs || new Set();
      observation.deriveCtxs.add(activeDeriveCtx);
    }

    observer.addObservation(observation);
  }
}
