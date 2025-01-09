import type { DeriveContext } from "keck/methods/derive";

import { getRootNodeForValue, type RootNode, type Value } from "./RootNode";

/**
 * An Observation represents a path that was accessed on an Observable for a specific Observer,
 * and should trigger the Observer's callback when that property is modified.
 * When an Observable's property is modified, each Observation is tested, and if all conditions are
 * met, it will trigger the callback for its associated Observer.
 *
 * These are stored in a PathMap on the RootNode, which is used to look up all Observations for a
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

export class Observer {
  private _enabled = true;

  /**
   * Indicates whether focus mode is enabled, disabled, or paused for this Observer.
   * - `undefined`: focus is disabled (all modifications are observed)
   * - `true`: focus is enabled
   * - `false`: focus is paused
   */
  private _isFocusing: boolean | undefined = undefined;

  rootNode: RootNode;

  /**
   * A WeakSet of Observations for this Observer; used to invalidate Observables when the Observer's
   * focus mode is disabled.
   */
  private _validObservations?: WeakSet<Observation>;

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

  reset(focus: boolean) {
    if (this._isFocusing === undefined) {
      throw new Error('reset() can only be called in focus mode');
    }
    this._isFocusing = !!focus;
    this._validObservations = undefined;
    if (!focus) this.createRootObservation();
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

  addObservation(observation: Observation) {
    if (!this._validObservations) this._validObservations = new WeakSet();
    this._validObservations.add(observation);
  }

  hasObservation(observation: Observation) {
    return this._validObservations?.has(observation);
  }
}

