import type { DeriveContext } from 'keck/methods/derive';

import { getRootNodeForValue, type RootNode, type Value } from './RootNode';

export interface ObserverCallbackContext {
  sourceName?: string;
  actionName?: string;
}

export interface ObserverConfig {
  name?: string;
  callback?: (context: ObserverCallbackContext) => void;
  focusable: boolean;
}

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
   * Independent of focus state so that a user-disabled observer stays disabled
   * after a focus session finishes.
   */
  private _userEnabled = true;

  /**
   * Fixed at construction time. Focusable observers only trigger callbacks for properties
   * explicitly accessed during a focus session. Non-focusable observers trigger on any deep change.
   */
  readonly isFocusable: boolean;

  /**
   * True while a focus session is in progress (between beginCapture and commitCapture/discardCapture).
   * Only focusable observers use focus sessions.
   */
  private _isInSession = false;

  rootNode: RootNode;

  readonly name?: string;

  callback?: (context: ObserverCallbackContext) => void;

  /**
   * A WeakSet of Observations for this Observer; used to check whether an observation is still
   * valid when a path is modified.
   */
  private _validObservations?: WeakSet<Observation>;

  /**
   * During a focus session, holds a reference to the pending Set owned by the focus closure.
   * Reads are routed here instead of _validObservations. The focus module sets this at
   * beginCapture and clears it at commit or discard.
   */
  private _pendingObservations?: Set<Observation>;

  constructor(value: Value, config: ObserverConfig) {
    const { name, callback, focusable } = config;
    this.name = name;
    this.callback = callback;
    this.isFocusable = focusable;
    this.rootNode = getRootNodeForValue(value);
    // Non-focusable observers watch all changes via a root-level observation.
    // Focusable observers register observations only during focus sessions.
    if (!this.isFocusable) {
      this.createRootObservation();
    }
  }

  /**
   * True when property reads should register observations. This is the case for focusable
   * observers that are currently in an active focus session.
   */
  get isFocusing() {
    return this.isFocusable && this._isInSession;
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
   * Called by the capture module when a new session starts. Borrows the pending Set
   * from the capture closure so that addObservation() routes reads there. Disables the
   * observer so writes during the session cannot trigger this observer's own callback.
   */
  beginCapture(pending: Set<Observation>) {
    this._pendingObservations = pending;
    this._isInSession = true;
  }

  /**
   * Called by the capture module on commit. Promotes the closed-over pending Set to
   * _validObservations and releases the borrow. Setting _pendingObservations to undefined
   * also re-enables the observer (enabled = _userEnabled && _pendingObservations === undefined).
   */
  commitCapture(pending: Set<Observation>) {
    this._validObservations = new WeakSet(pending);
    this._pendingObservations = undefined;
    this._isInSession = false;
  }

  /**
   * Called by the capture module on discard. Releases the pending Set borrow.
   * _validObservations is left untouched so pre-session observations are automatically
   * restored. Setting _pendingObservations to undefined also re-enables the observer.
   */
  discardCapture() {
    this._pendingObservations = undefined;
    this._isInSession = false;
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
