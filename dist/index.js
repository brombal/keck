var $8zHUo$react = require("react");

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "observe", () => $f758cd31714206a3$export$d1203567a167490e);
$parcel$export(module.exports, "unwrap", () => $f758cd31714206a3$export$debb760848ca95a);
$parcel$export(module.exports, "observableFactories", () => $f758cd31714206a3$export$e0440d5a58076798);
$parcel$export(module.exports, "configure", () => $f758cd31714206a3$export$8d21e34596265fa2);
$parcel$export(module.exports, "select", () => $f758cd31714206a3$export$2e6c959c16ff56b8);
$parcel$export(module.exports, "reset", () => $f758cd31714206a3$export$aad8462122ac592b);
$parcel$export(module.exports, "ref", () => $046eaf7a22d711d5$export$eff4d24c3ff7876e);
$parcel$export(module.exports, "objectAndArrayObservableFactory", () => $7ac2d515680cf951$export$521eebe5cf3f8bee);
$parcel$export(module.exports, "useObserver", () => $f4ac19f6490f8500$export$b9c7ecd090a87b14);
$parcel$export(module.exports, "useObserveSelector", () => $f4ac19f6490f8500$export$10d01aa5776497a2);

const $046eaf7a22d711d5$export$bfe1b587ae1fb843 = Symbol("ref");
function $046eaf7a22d711d5$export$eff4d24c3ff7876e(value) {
    const factory = (0, $f758cd31714206a3$export$e0440d5a58076798).get(value.constructor);
    if (!factory) return value;
    return {
        [$046eaf7a22d711d5$export$bfe1b587ae1fb843]: true,
        value: value
    };
}
function $046eaf7a22d711d5$export$4f9f5282de18fc69(value) {
    return value?.[$046eaf7a22d711d5$export$bfe1b587ae1fb843];
}


const $f758cd31714206a3$var$rootIdentifier = Symbol("root");
/**
 * Allows looking up an Observable's ObservableContext, so that it can be unwrapped
 */ const $f758cd31714206a3$var$contextForObservable = new WeakMap();
const $f758cd31714206a3$export$e0440d5a58076798 = new Map();
const $f758cd31714206a3$var$allDataNodes = new WeakMap();
function $f758cd31714206a3$var$getDataNode(identifier, value, parent) {
    const factory = $f758cd31714206a3$export$e0440d5a58076798.get(value.constructor);
    if (!factory) return undefined;
    let dataNode = parent ? parent.children.get(identifier) : $f758cd31714206a3$var$allDataNodes.get(value);
    if (dataNode) {
        dataNode.value = value;
        return dataNode;
    }
    dataNode = {
        identifier: identifier,
        value: value,
        children: new Map(),
        parent: parent,
        factory: factory,
        observersForChild: new Map(),
        validContexts: new WeakSet()
    };
    if (parent) parent.children.set(identifier, dataNode);
    $f758cd31714206a3$var$allDataNodes.set(value, dataNode);
    return dataNode;
}
function $f758cd31714206a3$var$createObservation(identifier, dataNode, observer) {
    let observations = dataNode.observersForChild.get(identifier);
    if (!observations) dataNode.observersForChild.set(identifier, observations = new Map());
    let selectors = observations.get(observer);
    // A non-selector observation is represented by an empty set
    const hasNonSelectorObservation = selectors && selectors.size === 0;
    if (!selectors) observations.set(observer, selectors = new Set());
    /**
   * Since non-selector observations override selector observations (i.e. they always
   * cause the callback to be invoked), we don't need to track any selectors if there is already
   * a non-selector observation.
   */ if ($f758cd31714206a3$var$activeSelector) {
        if (!hasNonSelectorObservation) selectors.add($f758cd31714206a3$var$activeSelector);
    } else selectors.clear();
    observer.disposers.add(()=>observations.delete(observer));
}
function $f758cd31714206a3$var$getObservableContext(observer, dataNode) {
    let ctx = observer.contextForNode.get(dataNode);
    // Check that the context is still valid
    if (ctx && !dataNode.validContexts.has(ctx)) {
        ctx = undefined;
        observer.contextForNode.delete(dataNode);
    }
    if (ctx) return ctx;
    ctx = {
        root: false,
        dataNode: dataNode,
        observer: observer,
        observable: null,
        get value () {
            return this.dataNode.value;
        },
        observeIdentifier (identifier, childValue, observeIntermediate = false) {
            // If the value is a function, just bind it to its parent and return
            if (typeof childValue === "function") return childValue.bind(this.observable);
            // If the property is something we know how to observe, return the observable value
            const childNode = childValue && !(0, $046eaf7a22d711d5$export$4f9f5282de18fc69)(childValue) && $f758cd31714206a3$var$getDataNode(identifier, childValue, dataNode);
            if (childNode) {
                if (observer.config.observe && ($f758cd31714206a3$var$activeSelector || observer.config.intermediates || observeIntermediate)) $f758cd31714206a3$var$createObservation(identifier, dataNode, observer);
                return $f758cd31714206a3$var$getObservableContext(observer, childNode).observable;
            }
            // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
            if (observer.config.observe) $f758cd31714206a3$var$createObservation(identifier, dataNode, observer);
            return childValue;
        },
        modifyIdentifier (childIdentifier, source) {
            // Clone the value if not the root
            if (observer.config.clone && dataNode.parent) dataNode.value = dataNode.factory.createClone(dataNode.value);
            // Invalidate Observables for all ObservableContexts of the child Identifier
            // The presence of `source` indicates that this is a recursive call, so we should not
            // invalidate unless we are cloning
            if ((observer.config.clone || !source) && dataNode.children.get(childIdentifier)) dataNode.children.get(childIdentifier).validContexts = new Set();
            // If this is a direct property modification, clear out all the DataNodes for its children
            if (!source) dataNode.children.get(childIdentifier)?.children.clear();
            // Trigger all Observer callbacks for the child Identifier
            dataNode.observersForChild.get(childIdentifier)?.forEach((selectors, observer)=>{
                let isAnyDifferent = undefined;
                if (selectors.size) {
                    isAnyDifferent = false;
                    for (const selector of selectors){
                        $f758cd31714206a3$var$activeSelector = selector;
                        const newValue = selector.selectorFn();
                        isAnyDifferent = isAnyDifferent || !(selector.isEqual || Object.is)(newValue, selector.lastValue);
                        selector.lastValue = newValue;
                        $f758cd31714206a3$var$activeSelector = undefined;
                    }
                }
                if (observer.config.enabled && (isAnyDifferent === true || isAnyDifferent === undefined)) observer.callback?.(source?.[0].value || dataNode.value, source?.[1] || childIdentifier);
            });
            // Let the parent Observable update itself with the cloned child
            dataNode.parent?.factory.handleChange(dataNode.parent.value, dataNode.identifier, dataNode.value);
            // Call modifyIdentifier on the parent/root ObservableContext
            if (childIdentifier !== $f758cd31714206a3$var$rootIdentifier) $f758cd31714206a3$var$getObservableContext(observer, dataNode.parent || dataNode)?.modifyIdentifier(dataNode.identifier, source || [
                dataNode,
                childIdentifier
            ]);
        }
    };
    ctx.observable = dataNode.factory.makeObservable(ctx);
    observer.contextForNode.set(dataNode, ctx);
    $f758cd31714206a3$var$contextForObservable.set(ctx.observable, ctx);
    dataNode.validContexts.add(ctx);
    return ctx;
}
function $f758cd31714206a3$export$d1203567a167490e(...args) {
    if (args.length === 2) return $f758cd31714206a3$export$9e6a5ff84f57576(args[0], args[1]);
    else return $f758cd31714206a3$export$1de6dde37a725a9b(args[0], args[1], args[2]);
}
function $f758cd31714206a3$export$9e6a5ff84f57576(data, cb) {
    // Get an existing DataNode, if possible. This happens when an observable from another tree is
    // passed to observe().
    const rootNode = $f758cd31714206a3$var$contextForObservable.get(data)?.dataNode || $f758cd31714206a3$var$getDataNode($f758cd31714206a3$var$rootIdentifier, data);
    if (!rootNode) throw new Error(`Cannot observe value ${data}`);
    const observer = {
        callback: cb,
        disposers: new Set(),
        contextForNode: new WeakMap(),
        config: $f758cd31714206a3$var$defaultConfig()
    };
    const ctx = $f758cd31714206a3$var$getObservableContext(observer, rootNode);
    ctx.root = true;
    return ctx.observable;
}
function $f758cd31714206a3$export$1de6dde37a725a9b(data, selectorFn, action, compare = Object.is) {
    const state = $f758cd31714206a3$export$d1203567a167490e(data, (value, childIdentifier)=>action(selectorFn(state), value, childIdentifier));
    $f758cd31714206a3$export$2e6c959c16ff56b8(()=>selectorFn(state), compare);
    $f758cd31714206a3$export$8d21e34596265fa2(state, {
        observe: false
    });
    return state;
}
let $f758cd31714206a3$var$activeSelector;
function $f758cd31714206a3$export$2e6c959c16ff56b8(selectorFn, isEqual) {
    if ($f758cd31714206a3$var$activeSelector) return selectorFn();
    $f758cd31714206a3$var$activeSelector = {
        selectorFn: selectorFn,
        isEqual: isEqual
    };
    const value = $f758cd31714206a3$var$activeSelector.lastValue = selectorFn();
    $f758cd31714206a3$var$activeSelector = undefined;
    return value;
}
const $f758cd31714206a3$var$defaultConfig = ()=>({
        observe: true,
        clone: false,
        intermediates: false,
        enabled: true
    });
function $f758cd31714206a3$export$8d21e34596265fa2(observable, options) {
    const ctx = $f758cd31714206a3$var$contextForObservable.get(observable);
    if (!ctx?.root) throw new Error(`Cannot configure non-observable ${observable}`);
    Object.assign(ctx.observer.config, options);
}
function $f758cd31714206a3$export$aad8462122ac592b(observable) {
    const ctx = $f758cd31714206a3$var$contextForObservable.get(observable);
    if (!ctx?.root) throw new Error(`Cannot reset non-observable ${observable}`);
    Object.assign(ctx.observer.config, $f758cd31714206a3$var$defaultConfig());
    ctx.observer.disposers.forEach((disposer)=>disposer());
    ctx.observer.disposers.clear();
}
function $f758cd31714206a3$export$debb760848ca95a(observable, observe = true) {
    const ctx = $f758cd31714206a3$var$contextForObservable.get(observable);
    if (!ctx) return observable;
    // Unwrapping can only create a observation in select mode
    if (observe && ctx.observer.config.observe) $f758cd31714206a3$var$getObservableContext(ctx.observer, ctx.dataNode.parent || ctx.dataNode)?.observeIdentifier(ctx.dataNode.identifier, ctx.value, true);
    return ctx.dataNode.value;
}


const $7ac2d515680cf951$export$521eebe5cf3f8bee = {
    makeObservable: (ctx)=>{
        return new Proxy(// The target of the proxy is not really relevant since we always get/set values directly on the context value object.
        // It's important to pass the original value though, because it needs to be an array for certain internal checks (Array.isArray, for example)
        ctx.value, {
            getPrototypeOf () {
                return Reflect.getPrototypeOf(ctx.value);
            },
            getOwnPropertyDescriptor (target, p) {
                ctx.observeIdentifier(p);
                return Reflect.getOwnPropertyDescriptor(ctx.value, p);
            },
            ownKeys () {
                return Reflect.ownKeys(ctx.value);
            },
            has (_, prop) {
                ctx.observeIdentifier(prop);
                return Reflect.has(ctx.value, prop);
            },
            get (_, prop) {
                if (prop === "toJSON") return ()=>ctx.value;
                const value = Reflect.get(ctx.value, prop, ctx.value);
                return ctx.observeIdentifier(prop, value);
            },
            set (_, prop, value) {
                const rawValue = (0, $f758cd31714206a3$export$debb760848ca95a)(value, false);
                const oldValue = Reflect.get(ctx.value, prop, ctx.value);
                if (oldValue === rawValue) return true;
                if (Array.isArray(ctx.value)) {
                    const arrayLength = ctx.value.length;
                    const setResult = Reflect.set(ctx.value, prop, rawValue, ctx.value);
                    if (arrayLength !== ctx.value.length) ctx.modifyIdentifier("length");
                    if (prop !== "length") ctx.modifyIdentifier(prop);
                    return setResult;
                }
                const result = Reflect.set(ctx.value, prop, rawValue, ctx.value);
                ctx.modifyIdentifier(prop);
                return result;
            },
            deleteProperty (_, prop) {
                const res = Reflect.deleteProperty(ctx.value, prop);
                if (res) ctx.modifyIdentifier(prop);
                return res;
            }
        });
    },
    handleChange (value, identifier, newValue) {
        value[identifier] = newValue;
    },
    createClone (value) {
        if (Array.isArray(value)) return [
            ...value
        ];
        const clone = {
            ...value
        };
        Object.setPrototypeOf(clone, Object.getPrototypeOf(value));
        return clone;
    }
};
(0, $f758cd31714206a3$export$e0440d5a58076798).set(Object, $7ac2d515680cf951$export$521eebe5cf3f8bee);
(0, $f758cd31714206a3$export$e0440d5a58076798).set(Array, $7ac2d515680cf951$export$521eebe5cf3f8bee);



const $ac37ca25d8d2c0b4$var$_size = Symbol("size");
class $ac37ca25d8d2c0b4$var$ObservableSet extends Set {
    constructor(ctx){
        super();
        this.ctx = ctx;
    }
    get set() {
        return this.ctx.value;
    }
    add(value) {
        const size = this.set.size;
        this.set.add(value);
        if (size !== this.set.size) this.ctx.modifyIdentifier($ac37ca25d8d2c0b4$var$_size);
        return this;
    }
    clear() {
        const size = this.set.size;
        this.set.clear();
        if (size !== this.set.size) this.ctx.modifyIdentifier($ac37ca25d8d2c0b4$var$_size);
    }
    delete(value) {
        const res = this.set.delete(value);
        if (res) this.ctx.modifyIdentifier($ac37ca25d8d2c0b4$var$_size);
        return res;
    }
    forEach(callbackFn, thisArg) {
        this.set.forEach((value, _key)=>{
            const observable = this.ctx.observeIdentifier(value, value);
            callbackFn.call(thisArg, observable, observable, this);
        }, thisArg);
        this.size;
    }
    has(value) {
        this.ctx.observeIdentifier($ac37ca25d8d2c0b4$var$_size);
        return this.set.has(value);
    }
    get size() {
        return this.ctx.observeIdentifier($ac37ca25d8d2c0b4$var$_size, this.set.size);
    }
    *[Symbol.iterator]() {
        this.ctx.observeIdentifier($ac37ca25d8d2c0b4$var$_size);
        for (const value of this.set)yield this.ctx.observeIdentifier(value, value);
    }
    *entries() {
        for (const value of this[Symbol.iterator]())yield [
            value,
            value
        ];
    }
    keys() {
        return this[Symbol.iterator]();
    }
    values() {
        return this[Symbol.iterator]();
    }
}
(0, $f758cd31714206a3$export$e0440d5a58076798).set(Set, {
    makeObservable: (ctx)=>{
        return new $ac37ca25d8d2c0b4$var$ObservableSet(ctx);
    },
    handleChange (value, identifier, newValue) {
        value.delete(identifier);
        value.add(newValue);
    },
    createClone (value) {
        return new Set(value);
    }
});



const $5074f1447801d804$var$_size = Symbol("size");
class $5074f1447801d804$export$db1c0901f08fc6fd extends Map {
    constructor(ctx){
        super();
        this.ctx = ctx;
    }
    get map() {
        return this.ctx.value;
    }
    clear() {
        const size = this.map.size;
        this.map.clear();
        if (size !== this.map.size) this.ctx.modifyIdentifier($5074f1447801d804$var$_size);
    }
    delete(key) {
        const res = this.map.delete(key);
        if (res) {
            this.ctx.modifyIdentifier(key);
            this.ctx.modifyIdentifier($5074f1447801d804$var$_size);
        }
        return res;
    }
    forEach(callbackFn, thisArg) {
        this.map.forEach((value, key)=>{
            const observable = this.ctx.observeIdentifier(key, value);
            callbackFn.call(thisArg, observable, key, this);
        }, thisArg);
        this.size;
    }
    get(key) {
        this.ctx.observeIdentifier(key);
        return this.map.get(key);
    }
    has(key) {
        this.ctx.observeIdentifier(key);
        return this.map.has(key);
    }
    set(key, value) {
        const size = this.map.size;
        this.map.set(key, value);
        if (size !== this.map.size) {
            this.ctx.modifyIdentifier(key);
            this.ctx.modifyIdentifier($5074f1447801d804$var$_size);
        }
        return this;
    }
    get size() {
        return this.ctx.observeIdentifier($5074f1447801d804$var$_size, this.ctx.value.size);
    }
    /** Returns an iterable of entries in the map. */ *[Symbol.iterator]() {
        this.ctx.observeIdentifier($5074f1447801d804$var$_size);
        for (const [key, value] of this.map){
            const observable = this.ctx.observeIdentifier(key, value);
            yield [
                key,
                observable
            ];
        }
    }
    entries() {
        return this[Symbol.iterator]();
    }
    keys() {
        this.ctx.observeIdentifier($5074f1447801d804$var$_size);
        return this.map.keys();
    }
    *values() {
        for (const [key, value] of this[Symbol.iterator]())yield value;
    }
}
(0, $f758cd31714206a3$export$e0440d5a58076798).set(Map, {
    makeObservable: (ctx)=>{
        return new $5074f1447801d804$export$db1c0901f08fc6fd(ctx);
    },
    handleChange (value, identifier, newValue) {
        value.delete(identifier);
        value.set(identifier, newValue);
    },
    createClone (value) {
        return new Map(value);
    }
});







function $f4ac19f6490f8500$export$b9c7ecd090a87b14(data) {
    const [, forceRerender] = (0, $8zHUo$react.useState)({});
    const store = (0, $8zHUo$react.useMemo)(()=>(0, $f758cd31714206a3$export$d1203567a167490e)(data, ()=>forceRerender({})), []);
    // Begin observing on render
    (0, $f758cd31714206a3$export$aad8462122ac592b)(store);
    (0, $f758cd31714206a3$export$8d21e34596265fa2)(store, {
        clone: true
    });
    // Stop observing as soon as component finishes rendering
    (0, $8zHUo$react.useEffect)(()=>{
        (0, $f758cd31714206a3$export$8d21e34596265fa2)(store, {
            observe: false
        });
    });
    // Disable callback when component unmounts
    (0, $8zHUo$react.useEffect)(()=>{
        return ()=>{
            (0, $f758cd31714206a3$export$aad8462122ac592b)(store);
            (0, $f758cd31714206a3$export$8d21e34596265fa2)(store, {
                enabled: false
            });
        };
    }, [
        store
    ]);
    return store;
}
function $f4ac19f6490f8500$export$10d01aa5776497a2(data, selector, action) {
    const [, forceRerender] = (0, $8zHUo$react.useState)({});
    const selectorResultRef = (0, $8zHUo$react.useRef)();
    const state = (0, $8zHUo$react.useRef)((0, $f758cd31714206a3$export$d1203567a167490e)(data, (state)=>{
        return selectorResultRef.current = selector(state);
    }, (v)=>{
        action?.(v);
        forceRerender({});
    })).current;
    (0, $8zHUo$react.useEffect)(()=>{
        return ()=>(0, $f758cd31714206a3$export$aad8462122ac592b)(state);
    }, []);
    return [
        selectorResultRef.current,
        state
    ];
}




//# sourceMappingURL=index.js.map
