const pathValue = Symbol('pathValue');
class PathMap {
    root = new Map();
    set(path, value) {
        let currentLevel = this.root;
        for (let i = 0; i < path.length; i++) {
            let child = currentLevel.get(path[i]);
            if (!child) {
                child = new Map();
                currentLevel.set(path[i], child);
            }
            currentLevel = child;
        }
        currentLevel.set(pathValue, value);
    }
    /**
     * Returns the value at the given path, and all children of the path.
     */
    get(path) {
        let currentLevel = this.root;
        for (let i = 0; i < path.length; i++) {
            currentLevel = currentLevel.get(path[i]);
            if (!currentLevel) {
                return undefined;
            }
        }
        return currentLevel.get(pathValue);
    }
    /**
     * Collects all values located at the given path, all of its parents, and all of its descendants into a flat array.
     */
    collect(path, type = 'all') {
        const result = [];
        let currentLevel = this.root;
        const ancestors = type === 'ancestors' || type === 'all';
        let i = 0;
        for (; i < path.length; i++) {
            if (ancestors && currentLevel.has(pathValue)) {
                result.push(currentLevel.get(pathValue));
            }
            currentLevel = currentLevel.get(path[i]);
            if (!currentLevel)
                return result;
        }
        if (currentLevel.has(pathValue))
            result.push(currentLevel.get(pathValue));
        if (type === 'children' || type === 'all') {
            this.collectChildren(currentLevel, result);
        }
        return result;
    }
    collectChildren(entry, result) {
        for (const child of entry.entries()) {
            if (child[0] !== pathValue) {
                if (child[1].has(pathValue)) {
                    result.push(child[1].get(pathValue));
                }
                this.collectChildren(child[1], result);
            }
        }
    }
}

let activeDeriveCtx;
const deriveCtxs = new PathMap();
function derive(fn, isEqual) {
    let thisSetCallback = false;
    if (!activeDeriveCtx) {
        activeDeriveCtx = deriveCtxs.get([fn, isEqual]);
        if (!activeDeriveCtx) {
            activeDeriveCtx = { fn, isEqual, prevResult: undefined };
            deriveCtxs.set([fn, isEqual], activeDeriveCtx);
        }
        thisSetCallback = true;
    }
    try {
        return (activeDeriveCtx.prevResult = fn());
    }
    finally {
        if (thisSetCallback) {
            activeDeriveCtx = undefined;
        }
    }
}
/**
 * Invokes the derive function of the given context, while setting it as the activeDeriveCtx.
 * This allows any observations made during the derive function to continue being derived observations.
 */
function invokeDeriveCtx(ctx) {
    let thisSetCallback = false;
    if (!activeDeriveCtx) {
        activeDeriveCtx = ctx;
        thisSetCallback = true;
    }
    try {
        return (activeDeriveCtx.prevResult = activeDeriveCtx.fn());
    }
    finally {
        if (thisSetCallback) {
            activeDeriveCtx = undefined;
        }
    }
}

function triggerObservations(observations) {
    // The Set of Observers to trigger (prevents triggering the same observer multiple times)
    const triggerObservers = new Set();
    // Map of validated DeriveContexts and whether their return values changed
    // (prevents redundant invocations of derive fn or isEqual)
    const verifiedDeriveCtxs = new Map();
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
                    if (changedResult)
                        skipObserver = false;
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
                if (changedResult)
                    skipObserver = false;
            }
        }
        if (!skipObserver)
            triggerObservers.add(observation.observer);
    }
    for (const observer of triggerObservers) {
        observer.callback?.();
    }
}

let atomicObservations;
function atomic(fn, args, thisArg) {
    let thisSetCallback = false;
    if (!atomicObservations) {
        atomicObservations = new Set();
        thisSetCallback = true;
    }
    try {
        return fn.apply(thisArg, args);
    }
    finally {
        if (thisSetCallback) {
            triggerObservations(atomicObservations);
            atomicObservations = undefined;
        }
    }
}

/**
 * The map of object prototypes to their observable factories.
 */
const observableFactories = new Map();
function getObservableFactory(classConstructor) {
    return observableFactories.get(classConstructor);
}

const contextForObservable = new WeakMap();
/**
 * An ObservableContext is used to manage an Observable (a proxy wrapper) value. Because Observables
 * have to be transparently identical to the value they represent, additional data about them has
 * to be stored in a separate object. ObservableContexts are transient objects that are created
 * internally when a property is accessed, and only exist until a descendant property is modified,
 * which invalidates it and its associated Observable. This invalidation is what allows references
 * to compare as unequal when the underlying value changes.
 *
 * ObservableContext objects are not accessible externally. They only exist while their associated
 * Observable proxy is in scope somewhere (because their factory maintains a reference to it in the
 * proxy or subclass it produces). When the original value is garbage collected, so is the
 * ObservableContext.
 */
class ObservableContext {
    rootNode;
    observer;
    value;
    path;
    observable;
    static getForObservable(observable, throwIfMissing = true) {
        const ctx = contextForObservable.get(observable);
        if (!ctx && throwIfMissing) {
            throw new Error('Value is not observable');
        }
        return ctx;
    }
    constructor(rootNode, observer, value, path) {
        this.rootNode = rootNode;
        this.observer = observer;
        this.value = value;
        this.path = path;
        this.observable = getObservableFactory(value.constructor)?.makeObservable(this);
        if (!this.observable)
            throw new Error(`Keck: value ${value} is not observable`);
        contextForObservable.set(this.observable, this);
    }
    observeIdentifier(identifier, childValue) {
        return this.rootNode.observePath(this.observer, [...this.path, identifier], childValue);
    }
    /**
     * Call this method when the value of an identifier has changed. This will notify any observers
     * to trigger their callbacks, if necessary.
     *
     * @param identifier The identifier that has changed.
     */
    modifyIdentifier(identifier) {
        this.rootNode.modifyPath([...this.path, identifier]);
    }
}

function deep(observable) {
    const ctx = ObservableContext.getForObservable(observable);
    return ctx.observer.rootNode.observePath(ctx.observer, ctx.path, ctx.value, true);
}

/**
 * Returns the original object of an observable wrapper. If `observable` is
 * not actually an observable, the value will be returned as-is.
 */
function unwrap(observable, deepObserve = false) {
    const ctx = ObservableContext.getForObservable(observable, false);
    if (ctx) {
        if (deepObserve)
            deep(observable);
        return ctx.value;
    }
    return observable;
}

const objectFactory = {
    makeObservable: (ctx) => {
        return new Proxy(
        // The target of the proxy is not really relevant since we always get/set values directly on the context value object.
        // It's important to pass the original value though, because it needs to be an array for certain internal checks (Array.isArray, for example)
        ctx.value, {
            has(_, prop) {
                ctx.observeIdentifier(prop);
                return Reflect.has(ctx.value, prop);
            },
            get(_, prop, observable) {
                // if (prop === "toJSON") return () => ctx.value;
                const propValue = Reflect.get(ctx.value, prop, observable);
                if (typeof propValue === 'function') {
                    return (...args) => {
                        // Todo cache function?
                        return atomic(propValue, args, observable);
                    };
                }
                return ctx.observeIdentifier(prop, propValue);
            },
            set(_, prop, newValue, observer) {
                const rawValue = unwrap(newValue);
                const oldValue = Reflect.get(ctx.value, prop, ctx.value);
                if (oldValue === rawValue)
                    return true;
                if (Array.isArray(ctx.value)) {
                    const arrayLength = ctx.value.length;
                    const setResult = Reflect.set(ctx.value, prop, rawValue, ctx.value);
                    atomic(() => {
                        if (arrayLength !== ctx.value.length)
                            ctx.modifyIdentifier('length');
                        if (prop !== 'length')
                            ctx.modifyIdentifier(prop);
                    });
                    return setResult;
                }
                const result = Reflect.set(ctx.value, prop, rawValue, observer);
                ctx.modifyIdentifier(prop);
                return result;
            },
            ownKeys(_) {
                const keys = Reflect.ownKeys(ctx.value);
                for (const key of keys) {
                    ctx.observeIdentifier(key);
                }
                return keys;
            },
            deleteProperty(_, prop) {
                const res = Reflect.deleteProperty(ctx.value, prop);
                if (res)
                    ctx.modifyIdentifier(prop);
                return res;
            },
        });
    },
};

/**
 * Registers a class that can be observed. You can provide a custom factory that produces observable
 * instances of the class. If no factory is provided, the default object factory will be used.
 * @param classConstructor The class to register.
 * @param factory The factory to use to create observable instances of the class.
 */
function registerClass(classConstructor, factory) {
    observableFactories.set(classConstructor, factory || objectFactory);
}

const _size$1 = Symbol('size');
class ObservableMap extends Map {
    ctx;
    constructor(ctx) {
        super();
        this.ctx = ctx;
    }
    get map() {
        return this.ctx.value;
    }
    clear() {
        const size = this.map.size;
        this.map.clear();
        if (size !== this.map.size)
            this.ctx.modifyIdentifier(_size$1);
    }
    delete(key) {
        const res = this.map.delete(key);
        if (res) {
            atomic(() => {
                this.ctx.modifyIdentifier(key);
                this.ctx.modifyIdentifier(_size$1);
            });
        }
        return res;
    }
    forEach(callbackFn, thisArg) {
        this.map.forEach((value, key) => {
            const observable = this.ctx.observeIdentifier(key, value);
            callbackFn.call(thisArg, observable, key, this);
        }, thisArg);
        void this.size;
    }
    get(key) {
        const value = this.map.get(key);
        return this.ctx.observeIdentifier(key, value);
    }
    has(key) {
        this.ctx.observeIdentifier(key);
        return this.map.has(key);
    }
    set(key, value) {
        const size = this.map.size;
        const oldValue = this.map.get(key);
        this.map.set(key, value);
        atomic(() => {
            if (size !== this.map.size)
                this.ctx.modifyIdentifier(_size$1);
            if (oldValue !== value)
                this.ctx.modifyIdentifier(key);
        });
        return this;
    }
    get size() {
        return this.ctx.observeIdentifier(_size$1, this.ctx.value.size);
    }
    /** Returns an iterable of entries in the map. */
    *[Symbol.iterator]() {
        this.ctx.observeIdentifier(_size$1);
        for (const entry of this.map) {
            const observable = this.ctx.observeIdentifier(entry[0], entry[1]);
            yield [entry[0], observable];
        }
    }
    entries() {
        return this[Symbol.iterator]();
    }
    keys() {
        this.ctx.observeIdentifier(_size$1);
        return this.map.keys();
    }
    *values() {
        for (const value of this[Symbol.iterator]()) {
            yield value[1];
        }
    }
}
registerClass(Map, {
    makeObservable: (ctx) => {
        return new ObservableMap(ctx);
    },
});

const _size = Symbol('size');
class ObservableSet extends Set {
    ctx;
    constructor(ctx) {
        super();
        this.ctx = ctx;
    }
    get set() {
        return this.ctx.value;
    }
    add(value) {
        const size = this.set.size;
        this.set.add(value);
        if (size !== this.set.size)
            this.ctx.modifyIdentifier(_size);
        return this;
    }
    clear() {
        const size = this.set.size;
        this.set.clear();
        if (size !== this.set.size)
            this.ctx.modifyIdentifier(_size);
    }
    delete(value) {
        const res = this.set.delete(value);
        if (res)
            this.ctx.modifyIdentifier(_size);
        return res;
    }
    forEach(callbackFn, thisArg) {
        this.set.forEach((value, _key) => {
            const observable = this.ctx.observeIdentifier(value, value);
            callbackFn.call(thisArg, observable, observable, this);
        }, thisArg);
        void this.size;
    }
    has(value) {
        this.ctx.observeIdentifier(_size);
        return this.set.has(value);
    }
    get size() {
        return this.ctx.observeIdentifier(_size, this.set.size);
    }
    *[Symbol.iterator]() {
        this.ctx.observeIdentifier(_size);
        for (const value of this.set) {
            yield this.ctx.observeIdentifier(value, value);
        }
    }
    *entries() {
        for (const value of this[Symbol.iterator]()) {
            yield [value, value];
        }
    }
    keys() {
        return this[Symbol.iterator]();
    }
    values() {
        return this[Symbol.iterator]();
    }
}
registerClass(Set, {
    makeObservable: (ctx) => {
        return new ObservableSet(ctx);
    },
});

registerClass(Object, objectFactory);
registerClass(Array, objectFactory);

/**
 * Disables an observer, preventing it from triggering its callback when its
 * observed properties are modified.
 * @param observable The observable to disable.
 */
function disable(observable) {
    ObservableContext.getForObservable(observable).observer.disable();
}
/**
 * Enables an observer, allowing it to trigger its callback when its observed
 * properties are modified.
 * @param observable The observable to enable.
 */
function enable(observable) {
    ObservableContext.getForObservable(observable).observer.enable();
}

function focus(observable, enableFocus = true) {
    ObservableContext.getForObservable(observable).observer.focus(enableFocus);
}

let peeking = false;
function isPeeking() {
    return peeking;
}
function peek(fn) {
    peeking = true;
    try {
        return fn();
    }
    finally {
        peeking = false;
    }
}

function isObservable(value, throwEx = false) {
    if (value && typeof value === 'object' && getObservableFactory(value.constructor)) {
        return true;
    }
    if (throwEx) {
        let valueLabel = String(value);
        if (value && (typeof value === 'object' || typeof value === 'function'))
            valueLabel = `of type ${value.constructor.name}`;
        else if (typeof value === 'string')
            valueLabel = `"${value}"`;
        throw new Error(`Value ${valueLabel} is not observable`);
    }
    return false;
}

const refMap = new WeakSet();
function ref(value) {
    if (isObservable(value))
        refMap.add(value);
    return value;
}
function isRef(value) {
    return refMap.has(value);
}

let silentMode = false;
/**
 * Use `silent` to execute a block of code without triggering any observer callbacks when modifications are made.
 * @param callback The block of code to execute.
 */
function silent(callback) {
    silentMode = true;
    callback();
    silentMode = false;
}

function getMapEntry(map, key, create, meta) {
    let value = map.get(key);
    if (!value) {
        value = create();
        map.set(key, value);
        if (meta)
            meta.created = true;
    }
    return value;
}

const rootNodeForValue = new WeakMap();
function getRootNodeForValue(value) {
    isObservable(value, true);
    return getMapEntry(rootNodeForValue, value, () => new RootNode());
}
class RootNode {
    pathEntries = new PathMap();
    observePath(observer, path, childValue, force = false) {
        let returnValue = childValue;
        if (isPeeking())
            return returnValue;
        const isObservable = childValue &&
            typeof childValue === 'object' &&
            getObservableFactory(childValue.constructor) &&
            !isRef(childValue);
        // If the given value is observable, return the observable for it
        if (isObservable) {
            returnValue = this.getObservable(observer, path, childValue);
        }
        if (force || activeDeriveCtx || (!isObservable && observer.isFocusing)) {
            this.createObservation(observer, path);
        }
        return returnValue;
    }
    modifyPath(path) {
        // Invalidate observables for this and all related paths
        const ancestors = this.pathEntries.collect(path, 'all');
        for (const pathEntry of ancestors) {
            pathEntry.observables = new WeakMap();
        }
        if (silentMode)
            return;
        const observationsToCall = atomicObservations || new Set();
        const pathEntries = this.pathEntries.collect(path);
        for (const pathEntry of pathEntries) {
            for (const observation of pathEntry.observations.values()) {
                if (!observation.observer.enabled)
                    continue;
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
    getObservable(observer, path, childValue) {
        isObservable(childValue, true);
        return getMapEntry(this.getPathEntry(path).observables, observer, () => new ObservableContext(this, observer, childValue, path)).observable;
    }
    getPathEntry(path) {
        return getMapEntry(this.pathEntries, path, () => ({ observables: new WeakMap(), observations: new Map() }));
    }
    createObservation(observer, path) {
        const pathEntry = this.getPathEntry(path);
        const getObservationMeta = { created: false };
        const observation = getMapEntry(pathEntry.observations, observer, () => ({ observer, path }), getObservationMeta);
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

class Observer {
    callback;
    _enabled = true;
    /**
     * Indicates whether focus mode is enabled, disabled, or paused for this Observer.
     * - `undefined`: focus is disabled (all modifications are observed)
     * - `true`: focus is enabled
     * - `false`: focus is paused
     */
    _isFocusing = undefined;
    rootNode;
    /**
     * A WeakSet of Observations for this Observer; used to invalidate Observables when the Observer's
     * focus mode is disabled.
     */
    _validObservations;
    constructor(value, callback) {
        this.callback = callback;
        this.rootNode = getRootNodeForValue(value);
        this.createRootObservation();
    }
    get isFocusing() {
        return this._isFocusing;
    }
    focus(enableFocus) {
        // Reset observations when enabling focus mode
        if (this._isFocusing === undefined && enableFocus) {
            this._validObservations = undefined;
        }
        this._isFocusing = enableFocus;
    }
    reset(focus) {
        if (this._isFocusing === undefined) {
            throw new Error('reset() can only be called in focus mode');
        }
        this._isFocusing = !!focus;
        this._validObservations = undefined;
        if (!focus)
            this.createRootObservation();
    }
    /**
     * Creates an observation on the root, which will trigger the callback
     * when any property is modified if this Observer is not in focus mode
     * @private
     */
    createRootObservation() {
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
    addObservation(observation) {
        if (!this._validObservations)
            this._validObservations = new WeakSet();
        this._validObservations.add(observation);
    }
    hasObservation(observation) {
        return this._validObservations?.has(observation);
    }
}

function observe(value, cb, deriveFn, isEqual) {
    value = unwrap(value);
    const observer = new Observer(value, cb);
    const state = observer.rootNode.getObservable(observer, [], value);
    if (deriveFn) {
        focus(state);
        derive(() => deriveFn(state), isEqual);
        focus(state, false);
    }
    return state;
}

function reset(observable, focus = false) {
    ObservableContext.getForObservable(observable).observer.reset(focus);
}

/**
 * Compares two objects for shallow equality. This is provided as a convenience utility for the k.derive()
 * method.
 *
 * @param a The value to compare
 * @param b The value to compare against
 */
function shallowCompare(a, b) {
    if (a === b)
        return true;
    if (typeof a !== 'object' || typeof b !== 'object')
        return false;
    if (a === null || b === null)
        return false;
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length)
        return false;
    for (const key of aKeys) {
        if (a[key] !== b[key])
            return false;
    }
    return true;
}

export { atomic, deep, derive, disable, enable, focus, isRef, observe, peek, ref, registerClass, reset, shallowCompare, silent, unwrap };
//# sourceMappingURL=index.js.map
