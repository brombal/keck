import type { DeriveContext } from 'keck/methods/derive';

import { getRootNodeForValue, type RootNode, type Value } from './RootNode';

/**
 * An Observation represents a path accessed on an observable proxy that should trigger the proxy's
 * Observer's callback when that path is modified.
 * When an proxy's path is modified, Keck looks up the proxy's Observer's RootNode, and checks
 * all of its Observation for that path. If all conditions are met, it will trigger the callback for
 * the Observation's Observer.
 *
 * These are stored in a PathMap on the shared RootNode, which is used to look up all Observations for a
 * given path, regardless of the Observer that created them. They are also stored in a WeakMap on the
 * Observer, which is used to invalidate Observations when the Observer's mode is changed.
 */
export interface Observation {
  /**
   * The Observer associated with this Observation.
   */
  observer: Observer;

  /**
   * The DeriveContexts that were active when a property was accessed, that are tested to check if
   * the Observer's callback should be triggered.
   * `undefined` here indicates that the property was accessed without a derive function, so the
   * observation is unconditional.
   */
  deriveCtxs?: Set<DeriveContext<any>>;
}

/**
 * An Observer represents a callback to be triggered when properties on an observable object graph
 * are modified. An Observer is responsible for creating the Observations that might trigger its
 * callback, and for tracking which observations are still valid (all Observations, however, are
 * stored on the RootNode).
 *
 * Observers are created directly by the `observe` method, and internally, care is taken to ensure
 * that no persistent references to Observers exist that might prevent them from being garbage
 * collected.
 */
export class Observer {
  private _enabled = true;

  /**
   * Indicates whether focus mode is enabled, disabled, or paused for this Observer.
   * - `undefined`: focus is disabled (all modifications are observed)
   * - `true`: focus is enabled
   * - `false`: focus is paused (new observations are not created but existing ones are still valid)
   */
  private _isFocusing: boolean | undefined = undefined;

  rootNode: RootNode;

  /**
   * A WeakSet of Observations for this Observer; used to invalidate Observables when the Observer's
   * focus mode is disabled.
   */
  private _validObservations?: WeakSet<Observation>;

  /**
   * During a transaction (i.e. a render), property reads stage here instead of going directly to
   * `_validObservations`. Since `hasObservation()` only checks `_validObservations`, pending
   * observations can never trigger callbacks. Promoted to `_validObservations` on commitTransaction().
   */
  private _pendingObservations?: Set<Observation>;

  constructor(
    value: Value,
    public callback?: () => void,
  ) {
    this.rootNode = getRootNodeForValue(value);
    this.createRootObservation();
  }

  get isFocusing() {
    return this._isFocusing;
  }

  focus(enableFocus: boolean) {
    // Reset observations when enabling focus mode
    if (this._isFocusing === undefined && enableFocus) {
      this._validObservations = undefined;
    }
    this._isFocusing = enableFocus;
  }

  /**
   * Resets all observations of properties of the observable.
   */
  reset() {
    // if (this._isFocusing === undefined) {
    //   throw new Error('reset() can only be called in focus mode');
    // }
    this._validObservations = undefined;
  }

  /**
   * Creates an observation on the root, which will trigger the callback
   * when any property is modified if this Observer is not in focus mode
   * @private
   */
  private createRootObservation() {
    this.rootNode.createObservation(this, []);
  }

  disable() {
    this._enabled = false;
  }

  enable() {
    this._enabled = true;
  }

  get enabled() {
    return this._enabled;
  }

  /**
   * Begins a transaction: clears committed observations and starts a pending staging area.
   * Reads during the transaction go to `_pendingObservations` and cannot trigger callbacks.
   * A second call discards the prior pending set, so Strict Mode double-invokes self-correct.
   */
  beginTransaction() {
    this._validObservations = undefined;
    this._pendingObservations = new Set();
    this._isFocusing = true;
  }

  /**
   * Commits the pending staging area to `_validObservations`, making them live.
   * Safe to call when no transaction is active (no-op for observations, clears _isFocusing).
   */
  commitTransaction() {
    if (this._pendingObservations !== undefined) {
      this._validObservations = new WeakSet();
      for (const obs of this._pendingObservations) {
        this._validObservations.add(obs);
      }
      this._pendingObservations = undefined;
    }
    this._isFocusing = false;
  }

  /**
   * Discards the pending staging area without touching `_validObservations`.
   * Used on unmount to release the pending Set without destroying committed observations.
   * Safe to call when no transaction is active.
   */
  discardTransaction() {
    this._pendingObservations = undefined;
    this._isFocusing = false;
  }

  addObservation(observation: Observation) {
    if (this._pendingObservations !== undefined) {
      this._pendingObservations.add(observation);
    } else {
      if (!this._validObservations) this._validObservations = new WeakSet();
      this._validObservations.add(observation);
    }
  }

  hasObservation(observation: Observation) {
    return !!this._validObservations?.has(observation);
  }
}
