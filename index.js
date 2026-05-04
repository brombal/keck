const config = {};
function configure(options) {
    Object.assign(config, options);
}
function resetConfiguration() {
    config.onError = undefined;
}
// Route an error to the configured handler, or rethrow asynchronously so it is never silently swallowed.
function reportError(error) {
    if (config.onError) {
        config.onError(error);
    }
    else {
        setTimeout(() => {
            throw error;
        }, 0);
    }
}

// Use a globalThis-keyed singleton so all installed copies of keck share the same
// registry. This lets libraries like keck-forms call registerObservableClass against
// their bundled keck copy and have it visible to the user's keck copy.
const REGISTRY_KEY = Symbol.for('keck:observableFactories');
if (!globalThis[REGISTRY_KEY]) {
    globalThis[REGISTRY_KEY] = new Map();
}
/**
 * The map of object prototypes to their observable factories.
 */
const observableFactories = globalThis[REGISTRY_KEY];
function getObservableFactory(classConstructor) {
    return observableFactories.get(classConstructor);
}

const contextForObservable = new WeakMap();
/**
 * An ObservableContext is used to manage additional data associated with an observable proxy
 * wrapper. Because observable proxies
 * have to be behaviorally identical to the value they represent, additional data about them has
 * to be stored in this separate object.
 *
 * ObservableContexts are ephemeral objects that are created
 * internally when a property is accessed, and only exist within the scope of the proxy — they are
 * garbage collected with the proxy. They also only exist until a descendant property is modified,
 * which invalidates it and its associated proxy. This invalidation is what allows references
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
        this.rootNode.modifyPath([...this.path, identifier], this.observer);
    }
}

/**
 * Returns the original object of an observable wrapper. If `observable` is
 * not actually an observable, the value will be returned as-is.
 */
function unwrap(observable) {
    const ctx = ObservableContext.getForObservable(observable, false);
    if (ctx) {
        return ctx.value;
    }
    return observable;
}

const pathValue = Symbol('pathValue');
class PathMap {
    root;
    constructor(options) {
        this.root = options?.weak ? new WeakMap() : new Map();
    }
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
        if (!this.root.entries) {
            throw new Error('Cannot call `collect` on a weak PathMap!');
        }
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
const deriveCtxs = new PathMap({ weak: true });
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
        const result = fn();
        if (thisSetCallback) {
            activeDeriveCtx.prevResult = result;
        }
        return unwrap(result);
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
    const prev = activeDeriveCtx;
    activeDeriveCtx = ctx;
    try {
        const result = ctx.fn();
        ctx.prevResult = result;
        return unwrap(result);
    }
    finally {
        activeDeriveCtx = prev;
    }
}

function triggerObservations(observations, context) {
    while (observations.size > 0) {
        // The Set of Observers to trigger (prevents triggering the same observer multiple times)
        const triggerObservers = new Set();
        // Map of validated DeriveContexts and whether their return values changed
        // (prevents redundant invocations of derive fn or isEqual)
        const verifiedDeriveCtxs = new Map();
        for (const observation of observations) {
            observations.delete(observation);
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
                    let nextResult;
                    let changedResult;
                    try {
                        nextResult = invokeDeriveCtx(deriveCtx);
                        changedResult = deriveCtx.isEqual
                            ? !deriveCtx.isEqual(prevResult, nextResult)
                            : prevResult !== nextResult;
                    }
                    catch (e) {
                        reportError(e);
                        // Treat a throwing derive as "changed" — safer to over-notify than silently suppress
                        changedResult = true;
                    }
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
            try {
                observer.callback?.(context);
            }
            catch (e) {
                reportError(e);
            }
        }
    }
}

let atomicObservations;
// Source name for the current atomic batch. Set by the first write in the batch;
// reset to undefined if writes from different-named sources occur in the same batch.
let atomicSourceName;
let atomicSourceNameSet = false;
// Action name for the current atomic batch. Set by the named atomic() overload.
let atomicActionName;
// Called by RootNode.modifyPath when a write occurs inside an atomic batch.
function recordAtomicSource(name) {
    if (!atomicSourceNameSet) {
        atomicSourceName = name;
        atomicSourceNameSet = true;
    }
    else if (atomicSourceName !== name) {
        atomicSourceName = undefined; // multiple different sources — ambiguous
    }
}
function atomic(nameOrFn, fnOrArgs, argsOrThis, thisArg) {
    let name;
    let fn;
    let args;
    let _thisArg;
    if (typeof nameOrFn === 'string') {
        name = nameOrFn;
        fn = fnOrArgs;
        args = argsOrThis;
        _thisArg = thisArg;
    }
    else {
        fn = nameOrFn;
        args = fnOrArgs;
        _thisArg = argsOrThis;
    }
    const result = atomicAllowPromise(fn, args, _thisArg, name);
    if (result instanceof Promise) {
        throw new Error('atomic() does not support async functions. Only the synchronous portion before the first await would be batched; writes after each await would notify observers individually. Restructure the work so the awaits happen outside atomic(), then call atomic() on the synchronous portion that applies the results.');
    }
    return result;
}
function atomicAllowPromise(fn, args, thisArg, name) {
    let thisSetCallback = false;
    if (!atomicObservations) {
        atomicObservations = new Set();
        atomicSourceName = undefined;
        atomicSourceNameSet = false;
        atomicActionName = name;
        thisSetCallback = true;
    }
    try {
        return fn.apply(thisArg, (args ?? []));
    }
    finally {
        if (thisSetCallback) {
            const ctx = { sourceName: atomicSourceName };
            if (atomicActionName !== undefined)
                ctx.actionName = atomicActionName;
            atomicSourceName = undefined;
            atomicSourceNameSet = false;
            atomicActionName = undefined;
            triggerObservations(atomicObservations, ctx);
            atomicObservations = undefined;
        }
    }
}

const keyLength = Symbol('keyLength');
const objectFactory = {
    makeObservable: (ctx) => {
        return new Proxy(
        // The target of the proxy is not really relevant since we always get/set values directly on the context value object.
        // It's important to pass the original value though, because it needs to be an array for certain internal checks (Array.isArray, for example)
        ctx.value, {
            get(_, prop, observable) {
                // if (prop === "toJSON") return () => ctx.value;
                const propValue = Reflect.get(ctx.value, prop, observable);
                if (typeof propValue === 'function') {
                    return (...args) => {
                        // Todo cache function?
                        return atomicAllowPromise(propValue, args, observable);
                    };
                }
                return ctx.observeIdentifier(prop, propValue);
            },
            set(_, prop, newValue, observer) {
                const rawValue = unwrap(newValue);
                const oldValue = Reflect.get(ctx.value, prop, ctx.value);
                if (oldValue === rawValue)
                    return true;
                const oldHas = Reflect.has(ctx.value, prop);
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
                // Check if property is a setter or a regular property
                if (isSetter(ctx.value, prop)) {
                    return atomic(() => {
                        const result = Reflect.set(ctx.value, prop, rawValue, observer);
                        ctx.modifyIdentifier(prop);
                        return result;
                    });
                }
                const result = Reflect.set(ctx.value, prop, rawValue, observer);
                atomic(() => {
                    ctx.modifyIdentifier(prop);
                    if (!oldHas)
                        ctx.modifyIdentifier(keyLength);
                });
                return result;
            },
            ownKeys(_) {
                const keys = Reflect.ownKeys(ctx.value);
                ctx.observeIdentifier(keyLength);
                return keys;
            },
            deleteProperty(_, prop) {
                const res = Reflect.deleteProperty(ctx.value, prop);
                if (res) {
                    atomic(() => {
                        ctx.modifyIdentifier(prop);
                        ctx.modifyIdentifier(keyLength);
                    });
                }
                return res;
            },
        });
    },
};
function findPropertyDescriptor(obj, prop) {
    while (obj) {
        const desc = Reflect.getOwnPropertyDescriptor(obj, prop);
        if (desc)
            return desc;
        obj = Object.getPrototypeOf(obj);
    }
    return undefined;
}
function isSetter(obj, prop) {
    return !!findPropertyDescriptor(obj, prop)?.set;
}

/**
 * Registers a class that can be observed. You can provide a custom factory that produces observable
 * instances of the class. If no factory is provided, the default object factory will be used.
 * @param classConstructor The class to register.
 * @param factory The factory to use to create observable instances of the class.
 */
function registerObservableClass(classConstructor, factory) {
    observableFactories.set(classConstructor, factory || objectFactory);
}

const _size$1 = Symbol('size');
class ObservableMap extends Map {
    #ctx;
    constructor(ctx) {
        super();
        this.#ctx = ctx;
        Object.defineProperty(this, 'constructor', {
            value: Map,
            enumerable: false,
            configurable: true,
        });
    }
    get map() {
        return this.#ctx.value;
    }
    clear() {
        const size = this.map.size;
        this.map.clear();
        if (size !== this.map.size)
            this.#ctx.modifyIdentifier(_size$1);
    }
    delete(key) {
        const rawKey = unwrap(key);
        const res = this.map.delete(rawKey);
        if (res) {
            atomic(() => {
                this.#ctx.modifyIdentifier(rawKey);
                this.#ctx.modifyIdentifier(_size$1);
            });
        }
        return res;
    }
    forEach(callbackFn, thisArg) {
        this.map.forEach((value, key) => {
            const observable = this.#ctx.observeIdentifier(key, value);
            callbackFn.call(thisArg, observable, key, this);
        }, thisArg);
        void this.size;
    }
    get(key) {
        const rawKey = unwrap(key);
        const value = this.map.get(rawKey);
        return this.#ctx.observeIdentifier(rawKey, value);
    }
    has(key) {
        const rawKey = unwrap(key);
        this.#ctx.observeIdentifier(rawKey);
        return this.map.has(rawKey);
    }
    set(key, value) {
        const rawKey = unwrap(key);
        const rawValue = unwrap(value);
        const size = this.map.size;
        const oldValue = this.map.get(rawKey);
        this.map.set(rawKey, rawValue);
        atomic(() => {
            if (size !== this.map.size)
                this.#ctx.modifyIdentifier(_size$1);
            if (oldValue !== rawValue)
                this.#ctx.modifyIdentifier(rawKey);
        });
        return this;
    }
    get size() {
        return this.#ctx.observeIdentifier(_size$1, this.#ctx.value.size);
    }
    /** Returns an iterable of entries in the map. */
    *[Symbol.iterator]() {
        this.#ctx.observeIdentifier(_size$1);
        for (const entry of this.map) {
            const observable = this.#ctx.observeIdentifier(entry[0], entry[1]);
            yield [entry[0], observable];
        }
    }
    entries() {
        return this[Symbol.iterator]();
    }
    keys() {
        this.#ctx.observeIdentifier(_size$1);
        return this.map.keys();
    }
    *values() {
        for (const value of this[Symbol.iterator]()) {
            yield value[1];
        }
    }
}
registerObservableClass(Map, {
    makeObservable: (ctx) => {
        return new ObservableMap(ctx);
    },
});

const _size = Symbol('size');
const _has = Symbol('has');
class ObservableSet extends Set {
    #ctx;
    constructor(ctx) {
        super();
        this.#ctx = ctx;
        Object.defineProperty(this, 'constructor', {
            value: Set,
            enumerable: false,
            configurable: true,
        });
    }
    get set() {
        return this.#ctx.value;
    }
    add(value) {
        const rawValue = unwrap(value);
        const size = this.set.size;
        this.set.add(rawValue);
        if (size !== this.set.size) {
            atomic(() => {
                this.#ctx.modifyIdentifier(_size);
                this.#ctx.modifyIdentifier(rawValue);
            });
        }
        return this;
    }
    clear() {
        const size = this.set.size;
        this.set.clear();
        if (size !== this.set.size) {
            atomic(() => {
                this.#ctx.modifyIdentifier(_size);
                this.#ctx.modifyIdentifier(_has);
            });
        }
    }
    delete(value) {
        const rawValue = unwrap(value);
        const res = this.set.delete(rawValue);
        if (res) {
            atomic(() => {
                this.#ctx.modifyIdentifier(_size);
                this.#ctx.modifyIdentifier(rawValue);
            });
        }
        return res;
    }
    forEach(callbackFn, thisArg) {
        this.set.forEach((value, _key) => {
            const observable = this.#ctx.observeIdentifier(value, value);
            callbackFn.call(thisArg, observable, observable, this);
        }, thisArg);
        void this.size;
    }
    has(value) {
        const rawValue = unwrap(value);
        this.#ctx.observeIdentifier(rawValue);
        this.#ctx.observeIdentifier(_has);
        return this.set.has(rawValue);
    }
    get size() {
        return this.#ctx.observeIdentifier(_size, this.set.size);
    }
    *[Symbol.iterator]() {
        this.#ctx.observeIdentifier(_size);
        for (const value of this.set) {
            yield this.#ctx.observeIdentifier(value, value);
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
registerObservableClass(Set, {
    makeObservable: (ctx) => {
        return new ObservableSet(ctx);
    },
});

// Detect multiple keck instances in the same realm and warn. Each copy increments
// this counter; anything above 1 means the user has duplicate installations.
const INSTANCE_KEY = Symbol.for('keck:instanceCount');
globalThis[INSTANCE_KEY] = (globalThis[INSTANCE_KEY] ?? 0) + 1;
if (globalThis[INSTANCE_KEY] > 1) {
    console.warn('[Keck] Multiple instances of keck are loaded in the same JavaScript environment. ' +
        'This usually means a dependency bundles a different version of keck than your project.' +
        'Ensure all packages share the same keck version to silence this warning.');
}
registerObservableClass(Object, objectFactory);
registerObservableClass(Array, objectFactory);

/**
 * Ensures that any changes to deep properties within the given value (which should be an observable type) will trigger
 * its observer's callback (in React, this ensures that the component is re-rendered on deep property changes).
 *
 * If `observable` is not an observable type (e.g. a primitive or null), it will be returned as-is. If `observer`
 * is an observable type, but is not an observable proxy, an error will be thrown.
 *
 * This only applies when the observable is focused (in unfocused mode, all changes trigger the callback). In React,
 * observers are always focused.
 *
 * e.g.
 * ```ts
 * const state = observe({ object1: { value1: 'value1' } }, callback);
 * deep(state.object1);
 * state.object1.value1 = 'new-value1';
 * // callback will be triggered
 * ```
 */
function deep(observable) {
    const ctx = ObservableContext.getForObservable(observable, false);
    if (ctx) {
        return ctx.observer.rootNode.observePath(ctx.observer, ctx.path, ctx.value, true);
    }
    // It's okay if `observable` is not actually an observable type, just return it as-is
    const f = observable && typeof observable === 'object'
        ? getObservableFactory(observable.constructor)
        : null;
    if (!f)
        return observable;
    // However, if it's an observable type but not actually an observable proxy, throw an error
    throw new Error('Keck: deep: value is not observable');
}

const fromSnapshot = Symbol('keck.fromSnapshot');

/**
 * Recursively transforms `target` into the shape of `source`, in place.
 *
 * - Both `target` and `source` must be arrays or plain objects;
 *   otherwise `source` is returned.
 * - If both `target` and `source` have the same structure type (array <-> array,
 *   object <-> object), then we recurse.
 * - Any mismatch in structure means we directly replace the `target` value with
 *   the `source` value.
 * - Any primitive or "complex object" (Date, Set, Map, etc.) in `source`
 *   directly replaces the value in `target`.
 * - Any properties in `target` not in `source` are deleted.
 *
 * @param target The object/array to transform *in-place*.
 * @param source The source object/array to match shape.
 * @returns The same `target` reference, now transformed to match `source`.
 * @throws If top-level `target` or `source` is not an array or plain object.
 */
function transformInPlace(target, source) {
    // A class that implements [fromSnapshot] takes full responsibility for
    // restoring itself from the plain-object snapshot. Skip all merge logic.
    if (target !== null && typeof target === 'object' && fromSnapshot in target) {
        target[fromSnapshot](source);
        return target;
    }
    if (!isSupportedStructure(target) || !isSupportedStructure(source)) {
        return source;
    }
    // If top-level mismatch, return source directly (new reference).
    if (Array.isArray(target) !== Array.isArray(source)) {
        // This effectively discards the old `target` reference.
        // The caller must use the returned value if they want the new shape.
        return source;
    }
    // If both are supported structures, transform object in place
    if (isPlainObject(target) && isPlainObject(source)) {
        // Remove keys in target that do not exist in source
        for (const key in target) {
            if (!Object.hasOwn(source, key)) {
                delete target[key];
            }
        }
    }
    else {
        // Both must be arrays: the type-mismatch check above already returned if types differ,
        // and both are supported structures, so if not plain objects they must be arrays.
        target.length = source.length;
    }
    // For each key in source, set/transform target’s value
    let key;
    for (key in source) {
        const srcVal = source[key];
        const tgtVal = target[key];
        if (isSupportedStructure(srcVal) && isSupportedStructure(tgtVal)) {
            // Supported structures => recurse (also handles [fromSnapshot] at deeper levels)
            target[key] = transformInPlace(tgtVal, srcVal);
        }
        else if (tgtVal !== null &&
            typeof tgtVal === 'object' &&
            fromSnapshot in tgtVal) {
            // Nested class instance with [fromSnapshot]: update in place, keep the reference
            tgtVal[fromSnapshot](srcVal);
        }
        else {
            // Type mismatch => direct replacement
            target[key] = srcVal;
        }
    }
    return target;
}
/**
 * Type guard: returns `true` if `val` is a *plain* JavaScript object
 * (i.e. `{}` — not `null`, not an array, and not any special built-in).
 */
function isPlainObject(val) {
    return (val !== null &&
        typeof val === 'object' &&
        Object.prototype.toString.call(val) === '[object Object]');
}
/**
 * Type guard: returns `true` if `val` is either an array or a plain object.
 * These are the only two "structures" our transform supports.
 */
function isSupportedStructure(val) {
    return Array.isArray(val) || isPlainObject(val);
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

function getMapEntry(map, key, create, meta, isEntryValid) {
    let value = map.get(key);
    if (!value || (isEntryValid && !isEntryValid(value))) {
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
    return getMapEntry(rootNodeForValue, value, () => new WeakRef(new RootNode()), {}, (ref) => !!ref.deref()).deref();
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
class RootNode {
    /**
     * A tree structure that mirrors this RootNode's associated value's object structure, containing
     * information about all of the observations on the value's observed paths.
     */
    pathEntries = new PathMap();
    /**
     * Strongly-held references to Observers that have registered callbacks. An Observer is added
     * here by observe() and removed by unobserve(). Without this, an Observer created with a
     * callback would be GC'd as soon as the caller drops the returned proxy reference.
     */
    callbackObservers = new Set();
    observePath(observer, path, childValue, force = false) {
        let returnValue = childValue;
        if (!force && isPeeking())
            return returnValue;
        const isObservable = childValue &&
            typeof childValue === 'object' &&
            getObservableFactory(childValue.constructor) &&
            !isRef(childValue);
        // If the given value is observable, return the observable for it
        if (isObservable) {
            returnValue = this.getObservable(observer, path, childValue);
        }
        if (force || (observer.isFocusing && (activeDeriveCtx || !isObservable))) {
            this.createObservation(observer, path);
        }
        return returnValue;
    }
    modifyPath(path, sourceObserver) {
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
                if (!observer.enabled)
                    continue;
                observationsToCall.add(observation);
            }
        }
        // If atomicObservers is set, then `atomic()` will handle calling the observers
        if (observationsToCall !== atomicObservations) {
            triggerObservations(observationsToCall, { sourceName: sourceObserver?.name });
        }
        else {
            recordAtomicSource(sourceObserver?.name);
        }
    }
    /**
     * Returns the observable proxy wrapper for the given observer at the given path and child value.
     * If no such observable exists yet, or the existing observable does not reference the given
     * child value, it will be (re-)created.
     */
    getObservable(observer, path, childValue) {
        isObservable(childValue, true);
        return getMapEntry(this.getPathEntry(path).observables, observer, () => new ObservableContext(this, observer, childValue, path), undefined, 
        /**
         * The ObservableContext's value must match childValue. If it doesn't that likely means
         * the object was replaced and a new ObservableContext needs to be created.
         */
        (ctx) => ctx.value === childValue).observable;
    }
    getPathEntry(path) {
        return getMapEntry(this.pathEntries, path, () => ({
            observables: new WeakMap(),
            observationsForObserver: new WeakMap(),
            allObservations: new Set(),
        }));
    }
    createObservation(observer, path) {
        const pathEntry = this.getPathEntry(path);
        const getObservationMeta = { created: false };
        const observation = getMapEntry(pathEntry.observationsForObserver, observer, () => ({ observer, path }), getObservationMeta, (entry) => observer.hasObservation(entry));
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
class Observer {
    /**
     * User-controlled enabled state. Set via the public disable()/enable() API.
     * Independent of focus state so that a user-disabled observer stays disabled
     * after a focus session finishes.
     */
    _userEnabled = true;
    /**
     * Fixed at construction time. Focusable observers only trigger callbacks for properties
     * explicitly accessed during a focus session. Non-focusable observers trigger on any deep change.
     */
    isFocusable;
    /**
     * True while a focus session is in progress (between beginCapture and commitCapture/discardCapture).
     * Only focusable observers use focus sessions.
     */
    _isInSession = false;
    rootNode;
    name;
    callback;
    /**
     * A WeakSet of Observations for this Observer; used to check whether an observation is still
     * valid when a path is modified.
     */
    _validObservations;
    /**
     * During a focus session, holds a reference to the pending Set owned by the focus closure.
     * Reads are routed here instead of _validObservations. The focus module sets this at
     * beginCapture and clears it at commit or discard.
     */
    _pendingObservations;
    constructor(value, config) {
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
    createRootObservation() {
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
    beginCapture(pending) {
        this._pendingObservations = pending;
        this._isInSession = true;
    }
    /**
     * Called by the capture module on commit. Promotes the closed-over pending Set to
     * _validObservations and releases the borrow. Setting _pendingObservations to undefined
     * also re-enables the observer (enabled = _userEnabled && _pendingObservations === undefined).
     */
    commitCapture(pending) {
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
    addObservation(observation) {
        if (this._pendingObservations !== undefined) {
            this._pendingObservations.add(observation);
        }
        else {
            if (!this._validObservations)
                this._validObservations = new WeakSet();
            this._validObservations.add(observation);
        }
    }
    hasObservation(observation) {
        return !!this._validObservations?.has(observation);
    }
}

const gcCallbacks = new Set();
let registry;
function fireGcCallbacks(heldValue) {
    for (const cb of gcCallbacks)
        cb(heldValue);
}
function initGarbageCollectionObservation(cb) {
    gcCallbacks.add(cb);
    if (!registry && typeof FinalizationRegistry !== 'undefined') {
        registry = new FinalizationRegistry(fireGcCallbacks);
    }
    return () => {
        gcCallbacks.delete(cb);
        if (gcCallbacks.size === 0)
            registry = undefined;
    };
}
function registerObservableFinalizer(state) {
    registry?.register(state, 'Keck observable released');
}

/**
 * Tracks the discard function for each observer that currently has an active focus session.
 * When a new session starts for the same observer, the prior one is settled first.
 */
const activeDiscards = new WeakMap();
/**
 * Begins a focus session on a focusable observable. Returns `{ commit, discard }` that are
 * idempotent and close over their own pending observation Set.
 *
 * During the session, property reads on the observable are recorded. On `commit()`, those
 * observations become active and will trigger the observer's callback when modified. On
 * `discard()`, the session is abandoned and prior observations are restored.
 *
 * A microtask is queued to auto-discard if neither `commit` nor `discard` is called before
 * the end of the current event cycle — covering abandoned renders (Suspense, concurrent
 * bail-outs) without requiring the caller to handle cleanup explicitly.
 *
 * If a prior session for the same observer is still active when this is called, it is
 * discarded before the new session begins.
 *
 * Throws if called on a non-focusable observer.
 */
function focus(observable) {
    const observer = ObservableContext.getForObservable(observable).observer;
    if (!observer.isFocusable) {
        throw new Error('focus() can only be called on a focusable observer (created with { focusable: true })');
    }
    // Settle any prior active session before starting a new one
    activeDiscards.get(observer)?.();
    // The pending Set is owned by this closure. The observer borrows a reference during the
    // session so that addObservation() routes reads here instead of _validObservations.
    const pending = new Set();
    observer.beginCapture(pending);
    let settled = false;
    const discard = () => {
        if (settled)
            return;
        settled = true;
        observer.discardCapture();
        activeDiscards.delete(observer);
    };
    const commit = () => {
        if (settled)
            return;
        settled = true;
        observer.commitCapture(pending);
        activeDiscards.delete(observer);
    };
    activeDiscards.set(observer, discard);
    queueMicrotask(discard);
    return { commit, discard };
}

function observe(value, cbOrConfig) {
    value = unwrap(value);
    let deriveFn;
    let isEqual;
    let cb;
    let isFocusable = false;
    let name;
    let state;
    if (cbOrConfig && typeof cbOrConfig === 'object') {
        if ('derive' in cbOrConfig) {
            isFocusable = true;
            name = cbOrConfig.name;
            let lastDerived;
            const rawDeriveFn = cbOrConfig.derive;
            deriveFn = (s) => {
                lastDerived = rawDeriveFn(s);
                return lastDerived;
            };
            isEqual = cbOrConfig.isEqual;
            cb = (ctx) => cbOrConfig.onChange(lastDerived, ctx);
        }
        else if ('focusable' in cbOrConfig) {
            isFocusable = true;
            name = cbOrConfig.name;
            cb = cbOrConfig.onChange;
        }
        else {
            // NamedConfig: name only, no callback
            name = cbOrConfig.name;
        }
    }
    else {
        cb = cbOrConfig;
    }
    const observer = new Observer(value, { name, callback: cb, focusable: isFocusable });
    state = observer.rootNode.getObservable(observer, [], value);
    if (deriveFn) {
        const session = focus(state);
        derive(() => deriveFn(state), isEqual);
        session.commit();
    }
    if (cb) {
        observer.rootNode.callbackObservers.add(observer);
    }
    else {
        registerObservableFinalizer(state);
    }
    return state;
}

function reset(observable) {
    ObservableContext.getForObservable(observable).observer.reset();
}

function connectDevTools(store, options) {
    const ext = globalThis.__REDUX_DEVTOOLS_EXTENSION__;
    if (!ext)
        return () => { };
    const raw = unwrap(store);
    const devtools = ext.connect({ name: options?.name ?? 'Keck Store' });
    devtools.init(JSON.parse(JSON.stringify(raw)));
    let suppressNotification = false;
    const proxy = observe(raw, (ctx) => {
        if (suppressNotification)
            return;
        const type = ctx.actionName && ctx.sourceName
            ? `${ctx.actionName} (${ctx.sourceName})`
            : (ctx.actionName ?? ctx.sourceName ?? '@@keck/mutation');
        devtools.send({ type }, JSON.parse(JSON.stringify(unwrap(store))));
    });
    const unsubscribe = devtools.subscribe((message) => {
        if (message.type === 'DISPATCH' && message.payload.type === 'JUMP_TO_ACTION') {
            suppressNotification = true;
            transformInPlace(proxy, JSON.parse(message.state));
            suppressNotification = false;
        }
    });
    return () => {
        unsubscribe();
        reset(proxy);
    };
}

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

/**
 * Releases the callback registered for the given observable proxy, stopping future invocations.
 * The proxy itself remains valid for reads and writes.
 *
 * Must be called to clean up any observer created with a callback (via `observe(value, cb)` or
 * `observe(value, { focusable, onChange })`) when it is no longer needed, since those observers
 * are held strongly by the library and will not be garbage collected on their own.
 */
function unobserve(state) {
    const ctx = ObservableContext.getForObservable(state, false);
    if (!ctx)
        return;
    const { observer } = ctx;
    observer.rootNode.callbackObservers.delete(observer);
    observer.reset();
    fireGcCallbacks('Keck observable released');
}

/**
 * Compares two objects for shallow equality. This is provided as a convenience utility for `derive()`.
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

export { atomic, configure, connectDevTools, deep, derive, disable, enable, focus, fromSnapshot, initGarbageCollectionObservation, isRef, observe, peek, ref, registerObservableClass, reset, resetConfiguration, shallowCompare, silent, transformInPlace, unobserve, unwrap };
//# sourceMappingURL=index.js.map
