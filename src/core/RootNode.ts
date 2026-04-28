import { isObservable } from 'keck/core/IsObservable';
import { ObservableContext } from 'keck/core/ObservableContext';
import { triggerObservations } from 'keck/core/triggerObservations';
import { getObservableFactory } from 'keck/factories/observableFactories';
import { atomicObservations } from 'keck/methods/atomic';
import { activeDeriveCtx } from 'keck/methods/derive';
import { isPeeking } from 'keck/methods/peek';
import { isRef } from 'keck/methods/ref';
import { silentMode } from 'keck/methods/silent';
import { getMapEntry } from 'keck/util/getMapEntry';
import { PathMap } from 'keck/util/PathMap';
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

/**
 * Represents an entry in a RootNode's pathEntries PathMap structure.
 * @see RootNode.pathEntries
 */
interface RootNodePathEntry {
  /**
   * Used to look up an existing ObservableContext for an Observer at the given path,
   * and to invalidate the ObservableContext for an Observer at a given path.
   *
   * TODO should there be a separate WeakMap for Observables? It might be more performant to
   *  only invalidate Observables but leave their ObservableContexts intact and reuse them by
   *  reassigning an Observable when it is recreated.
   */
  observables: WeakMap<Observer, ObservableContext<any>>;
  observationsForObserver: WeakMap<Observer, Observation>; // to look up observations by Observer
  allObservations: Set<WeakRef<Observation>>; // to iterate all Observations for this path
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

/**
 * A RootNode is the root of the observable tracking system for a given object graph. Only one
 * RootNode exists per root Value object.
 * It maintains a PathMap of all observed paths, and is responsible for creating Observations
 * and ObservableContexts as needed.
 *
 * When a path is modified, it invalidates all related Observables and triggers the appropriate
 * Observations.
 *
 * RootNode objects are only created by getRootNodeForValue, and are stored in a WeakMap keyed by
 * the root Value object.
 */
export class RootNode {
  /**
   * A tree structure that mirrors this RootNode's associated value's object structure, containing
   * information about all of the observations on the value's observed paths.
   */
  pathEntries = new PathMap<RootNodePathEntry>();

  observePath(observer: Observer, path: Path, childValue: Value, force = false) {
    let returnValue = childValue;

    if (!force && isPeeking()) return returnValue;

    const isObservable =
      childValue &&
      typeof childValue === 'object' &&
      getObservableFactory(childValue.constructor) &&
      !isRef(childValue);

    // If the given value is observable, return the observable for it
    if (isObservable) {
      returnValue = this.getObservable(observer, path, childValue) as any as Value;
    }

    if (force || (observer.isFocusing && (activeDeriveCtx || !isObservable))) {
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

    const observationsToCall = atomicObservations || new Set<Observation>();

    const pathEntries = this.pathEntries.collect(path);

    for (const pathEntry of pathEntries) {
      for (const observationRef of pathEntry.allObservations) {
        const observation = observationRef.deref();
        const observer = observation?.observer;

        if (!observation || !observer) {
          pathEntry.allObservations.delete(observationRef);
          continue;
        }

        // If the Observation is not valid, remove it from the map
        // (it could have been cleared out by resetting the observer)
        if (!observer.hasObservation(observation)) {
          pathEntry.observationsForObserver.delete(observer);
          continue;
        }

        if (!observer.enabled) continue;

        observationsToCall.add(observation);
      }
    }

    // If atomicObservers is set, then `atomic()` will handle calling the observers
    if (observationsToCall !== atomicObservations) {
      triggerObservations(observationsToCall);
    }
  }

  /**
   * Returns the observable proxy wrapper for the given observer at the given path and child value.
   * If no such observable exists yet, or the existing observable does not reference the given
   * child value, it will be (re-)created.
   */
  getObservable(observer: Observer, path: Path, childValue: Value) {
    isObservable(childValue, true);

    return getMapEntry(
      this.getPathEntry(path).observables,
      observer,
      () => new ObservableContext(this, observer, childValue, path),
      undefined,
      /**
       * The ObservableContext's value must match childValue. If it doesn't that likely means
       * the object was replaced and a new ObservableContext needs to be created.
       */
      (ctx) => ctx.value === childValue,
    ).observable;
  }

  private getPathEntry(path: Path) {
    return getMapEntry(this.pathEntries, path, () => ({
      observables: new WeakMap<Observer, ObservableContext<any>>(),
      observationsForObserver: new WeakMap<Observer, Observation>(),
      allObservations: new Set<WeakRef<Observation>>(),
    }));
  }

  createObservation(observer: Observer, path: Path) {
    const pathEntry = this.getPathEntry(path);
    const getObservationMeta = { created: false };
    const observation = getMapEntry(
      pathEntry.observationsForObserver,
      observer,
      () => ({ observer, path }),
      getObservationMeta,
      (entry) => observer.hasObservation(entry),
    );

    // If the observation was just created, add it to the set of all observations for this path
    pathEntry.allObservations.add(new WeakRef(observation));

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
