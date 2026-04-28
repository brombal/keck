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
  /**
   * User-controlled enabled state. Set via the public disable()/enable() API.
   * Independent of transaction state so that a user-disabled observer stays disabled
   * after a transaction finishes.
   */
  private _userEnabled = true;

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
   * During a transaction, holds a reference to the pending Set owned by the transaction closure.
   * Reads are routed here instead of _validObservations. The transaction module sets this at
   * beginTransaction and clears it at commit or discard.
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

  reset() {
    this._validObservations = undefined;
  }

  private createRootObservation() {
    this.rootNode.createObservation(this, []);
  }

  disable() {
    this._userEnabled = false;
  }

  enable() {
    this._userEnabled = true;
  }

  get enabled() {
    return this._userEnabled && this._pendingObservations === undefined;
  }

  /**
   * Called by the transaction module when a new transaction starts. Borrows the pending Set
   * from the transaction closure so that addObservation() routes reads there. Disables the
   * observer so writes during the render cannot trigger this observer's own callback.
   */
  beginTransaction(pending: Set<Observation>) {
    this._pendingObservations = pending;
    this._isFocusing = true;
  }

  /**
   * Called by the transaction module on commit. Promotes the closed-over pending Set to
   * _validObservations and releases the borrow. Setting _pendingObservations to undefined
   * also re-enables the observer (enabled = _userEnabled && _pendingObservations === undefined).
   */
  commitTransaction(pending: Set<Observation>) {
    this._validObservations = new WeakSet(pending);
    this._pendingObservations = undefined;
    this._isFocusing = false;
  }

  /**
   * Called by the transaction module on discard. Releases the pending Set borrow.
   * _validObservations is left untouched so pre-transaction subscriptions are automatically
   * restored. Setting _pendingObservations to undefined also re-enables the observer.
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
