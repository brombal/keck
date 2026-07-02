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

  /**
   * Observations that were *pending* (read earlier in the active focus session) when another
   * observer wrote to them. The session's consumer read a value that is now stale, but the
   * callback cannot fire mid-session (the consumer may be mid-render), so these are recorded
   * and triggered when the session settles.
   */
  private _stalePendingObservations?: Set<Observation>;

  /**
   * Observations that were *committed* (valid from a prior session) but not yet re-read in the
   * active focus session when another observer wrote to them. These only matter if the session
   * is discarded: the restored observations belong to a consumer whose last committed state read
   * the old value. On commit they are irrelevant — either the session re-read the path (fresh
   * value) or the new committed observations no longer include it.
   */
  private _staleCommittedObservations?: Set<Observation>;

  /**
   * The sourceName of the most recent write that marked an observation stale, passed through to
   * the callback context when the session settles.
   */
  private _staleSourceName?: string;

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
   *
   * Returns the stale observations that should now trigger the callback (see StaleObservations),
   * or undefined if there are none.
   */
  commitCapture(pending: Set<Observation>): StaleObservations | undefined {
    this._validObservations = new WeakSet(pending);
    this._pendingObservations = undefined;
    this._isInSession = false;
    return this._takeStaleObservations('commit');
  }

  /**
   * Called by the capture module on discard. Releases the pending Set borrow.
   * _validObservations is left untouched so pre-session observations are automatically
   * restored. Setting _pendingObservations to undefined also re-enables the observer.
   *
   * Returns the stale observations that should now trigger the callback (see StaleObservations),
   * or undefined if there are none.
   */
  discardCapture(): StaleObservations | undefined {
    this._pendingObservations = undefined;
    this._isInSession = false;
    return this._takeStaleObservations('discard');
  }

  /**
   * Collects and clears the stale observations recorded during the session, filtered to those
   * that are relevant for the way the session settled:
   *
   * - On commit, only stale *pending* observations fire: they were just promoted to
   *   _validObservations, and the consumer committed a read of a value that changed after the
   *   read. Stale *committed* observations are dropped — either the session re-read the path
   *   (fresh value) or the new observations no longer include it.
   * - On discard, the prior observations are restored, so any stale observation still in
   *   _validObservations fires: the consumer's last committed state read the old value, and the
   *   write would have triggered normally had the session not briefly existed.
   *
   * Respects the user-controlled disable() state.
   */
  private _takeStaleObservations(settle: 'commit' | 'discard'): StaleObservations | undefined {
    const stalePending = this._stalePendingObservations;
    const staleCommitted = this._staleCommittedObservations;
    const sourceName = this._staleSourceName;
    this._stalePendingObservations = undefined;
    this._staleCommittedObservations = undefined;
    this._staleSourceName = undefined;

    if (!this._userEnabled || (!stalePending && !staleCommitted)) return undefined;

    const observations = new Set<Observation>();
    if (settle === 'commit') {
      for (const observation of stalePending || []) observations.add(observation);
    } else {
      for (const observation of stalePending || []) {
        if (this.hasObservation(observation)) observations.add(observation);
      }
      for (const observation of staleCommitted || []) {
        if (this.hasObservation(observation)) observations.add(observation);
      }
    }
    return observations.size ? { observations, sourceName } : undefined;
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

  /**
   * True if the observation was read during the currently-active focus session.
   */
  hasPendingObservation(observation: Observation) {
    return !!this._pendingObservations?.has(observation);
  }

  /**
   * Records that a pending observation was written to by another observer during the active
   * focus session. Called by RootNode.modifyPath; triggered when the session settles.
   */
  markStalePending(observation: Observation, sourceName: string | undefined) {
    (this._stalePendingObservations ??= new Set()).add(observation);
    this._staleSourceName = sourceName;
  }

  /**
   * Records that a committed (valid, not re-read this session) observation was written to by
   * another observer during the active focus session. Only fires if the session is discarded.
   */
  markStaleCommitted(observation: Observation, sourceName: string | undefined) {
    (this._staleCommittedObservations ??= new Set()).add(observation);
    this._staleSourceName = sourceName;
  }
}

/**
 * Stale observations collected during a focus session, returned to the focus module when the
 * session settles so it can trigger the observer's callback (batching into an active atomic()
 * block if one exists).
 */
export interface StaleObservations {
  observations: Set<Observation>;
  sourceName?: string;
}
