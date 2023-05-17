import {useState as $hgUW1$useState, useMemo as $hgUW1$useMemo, useEffect as $hgUW1$useEffect, useRef as $hgUW1$useRef} from "react";

/**
 * Represents a node in an observable tree. Nodes are shared by all Observers of the same object.
 */ const $d4d00b2c18281bdc$var$rootIdentifier = Symbol("root");
/**
 * Allows looking up an Observable's ObservableContext, so that it can be unwrapped
 */ const $d4d00b2c18281bdc$var$contextForObservable = new WeakMap();
const $d4d00b2c18281bdc$export$e0440d5a58076798 = new Map();
const $d4d00b2c18281bdc$var$allDataNodes = new WeakMap();
function $d4d00b2c18281bdc$var$getDataNode(identifier, value, parent) {
    const factory = $d4d00b2c18281bdc$export$e0440d5a58076798.get(value.constructor);
    if (!factory) return undefined;
    let dataNode = parent ? parent.children.get(identifier) : $d4d00b2c18281bdc$var$allDataNodes.get(value);
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
    $d4d00b2c18281bdc$var$allDataNodes.set(value, dataNode);
    return dataNode;
}
function $d4d00b2c18281bdc$var$createObservation(identifier, dataNode, observer) {
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
   */ if ($d4d00b2c18281bdc$var$activeSelector) {
        if (!hasNonSelectorObservation) selectors.add($d4d00b2c18281bdc$var$activeSelector);
    } else selectors.clear();
    observer.disposers.add(()=>observations.delete(observer));
}
function $d4d00b2c18281bdc$var$getObservableContext(observer, dataNode) {
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
            const childNode = childValue && $d4d00b2c18281bdc$var$getDataNode(identifier, childValue, dataNode);
            if (childNode) {
                if (observer.config.observe && ($d4d00b2c18281bdc$var$activeSelector || observer.config.intermediates || observeIntermediate)) $d4d00b2c18281bdc$var$createObservation(identifier, dataNode, observer);
                return $d4d00b2c18281bdc$var$getObservableContext(observer, childNode).observable;
            }
            // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
            if (observer.config.observe) $d4d00b2c18281bdc$var$createObservation(identifier, dataNode, observer);
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
                        $d4d00b2c18281bdc$var$activeSelector = selector;
                        const newValue = selector.selectorFn();
                        isAnyDifferent = isAnyDifferent || !(selector.isEqual || Object.is)(newValue, selector.lastValue);
                        selector.lastValue = newValue;
                        $d4d00b2c18281bdc$var$activeSelector = undefined;
                    }
                }
                if (observer.config.enabled && (isAnyDifferent === true || isAnyDifferent === undefined)) observer.callback?.(source?.[0].value || dataNode.value, source?.[1] || childIdentifier);
            });
            // Let the parent Observable update itself with the cloned child
            dataNode.parent?.factory.handleChange(dataNode.parent.value, dataNode.identifier, dataNode.value);
            // Call modifyIdentifier on the parent/root ObservableContext
            if (childIdentifier !== $d4d00b2c18281bdc$var$rootIdentifier) $d4d00b2c18281bdc$var$getObservableContext(observer, dataNode.parent || dataNode)?.modifyIdentifier(dataNode.identifier, source || [
                dataNode,
                childIdentifier
            ]);
        }
    };
    ctx.observable = dataNode.factory.makeObservable(ctx);
    observer.contextForNode.set(dataNode, ctx);
    $d4d00b2c18281bdc$var$contextForObservable.set(ctx.observable, ctx);
    dataNode.validContexts.add(ctx);
    return ctx;
}
function $d4d00b2c18281bdc$export$d1203567a167490e(...args) {
    if (args.length === 2) return $d4d00b2c18281bdc$export$9e6a5ff84f57576(args[0], args[1]);
    else return $d4d00b2c18281bdc$export$1de6dde37a725a9b(args[0], args[1], args[2]);
}
function $d4d00b2c18281bdc$export$9e6a5ff84f57576(data, cb) {
    // Get an existing DataNode, if possible. This happens when an observable from another tree is
    // passed to observe().
    const rootNode = $d4d00b2c18281bdc$var$contextForObservable.get(data)?.dataNode || $d4d00b2c18281bdc$var$getDataNode($d4d00b2c18281bdc$var$rootIdentifier, data);
    if (!rootNode) throw new Error(`Cannot observe value ${data}`);
    const observer = {
        callback: cb,
        disposers: new Set(),
        contextForNode: new WeakMap(),
        config: $d4d00b2c18281bdc$var$defaultConfig()
    };
    const ctx = $d4d00b2c18281bdc$var$getObservableContext(observer, rootNode);
    ctx.root = true;
    return ctx.observable;
}
function $d4d00b2c18281bdc$export$1de6dde37a725a9b(data, selectorFn, action, compare = Object.is) {
    const state = $d4d00b2c18281bdc$export$d1203567a167490e(data, (value, childIdentifier)=>action(selectorFn(state), value, childIdentifier));
    $d4d00b2c18281bdc$export$2e6c959c16ff56b8(()=>selectorFn(state), compare);
    $d4d00b2c18281bdc$export$8d21e34596265fa2(state, {
        observe: false
    });
    return state;
}
let $d4d00b2c18281bdc$var$activeSelector;
function $d4d00b2c18281bdc$export$2e6c959c16ff56b8(selectorFn, isEqual) {
    if ($d4d00b2c18281bdc$var$activeSelector) return selectorFn();
    $d4d00b2c18281bdc$var$activeSelector = {
        selectorFn: selectorFn,
        isEqual: isEqual
    };
    const value = $d4d00b2c18281bdc$var$activeSelector.lastValue = selectorFn();
    $d4d00b2c18281bdc$var$activeSelector = undefined;
    return value;
}
const $d4d00b2c18281bdc$var$defaultConfig = ()=>({
        observe: true,
        clone: false,
        intermediates: false,
        enabled: true
    });
function $d4d00b2c18281bdc$export$8d21e34596265fa2(observable, options) {
    const ctx = $d4d00b2c18281bdc$var$contextForObservable.get(observable);
    if (!ctx?.root) throw new Error(`Cannot configure non-observable ${observable}`);
    Object.assign(ctx.observer.config, options);
}
function $d4d00b2c18281bdc$export$aad8462122ac592b(observable) {
    const ctx = $d4d00b2c18281bdc$var$contextForObservable.get(observable);
    if (!ctx?.root) throw new Error(`Cannot reset non-observable ${observable}`);
    Object.assign(ctx.observer.config, $d4d00b2c18281bdc$var$defaultConfig());
    ctx.observer.disposers.forEach((disposer)=>disposer());
    ctx.observer.disposers.clear();
}
function $d4d00b2c18281bdc$export$debb760848ca95a(observable, observe = true) {
    const ctx = $d4d00b2c18281bdc$var$contextForObservable.get(observable);
    if (!ctx) return observable;
    // Unwrapping can only create a observation in select mode
    if (observe && ctx.observer.config.observe) $d4d00b2c18281bdc$var$getObservableContext(ctx.observer, ctx.dataNode.parent || ctx.dataNode)?.observeIdentifier(ctx.dataNode.identifier, ctx.value, true);
    return ctx.dataNode.value;
}


const $379af7c1c9c51789$export$521eebe5cf3f8bee = {
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
                const rawValue = (0, $d4d00b2c18281bdc$export$debb760848ca95a)(value, false);
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
(0, $d4d00b2c18281bdc$export$e0440d5a58076798).set(Object, $379af7c1c9c51789$export$521eebe5cf3f8bee);
(0, $d4d00b2c18281bdc$export$e0440d5a58076798).set(Array, $379af7c1c9c51789$export$521eebe5cf3f8bee);



const $f5dafa803dcddca0$var$_size = Symbol("size");
class $f5dafa803dcddca0$var$ObservableSet extends Set {
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
        if (size !== this.set.size) this.ctx.modifyIdentifier($f5dafa803dcddca0$var$_size);
        return this;
    }
    clear() {
        const size = this.set.size;
        this.set.clear();
        if (size !== this.set.size) this.ctx.modifyIdentifier($f5dafa803dcddca0$var$_size);
    }
    delete(value) {
        const res = this.set.delete(value);
        if (res) this.ctx.modifyIdentifier($f5dafa803dcddca0$var$_size);
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
        this.ctx.observeIdentifier($f5dafa803dcddca0$var$_size);
        return this.set.has(value);
    }
    get size() {
        return this.ctx.observeIdentifier($f5dafa803dcddca0$var$_size, this.set.size);
    }
    *[Symbol.iterator]() {
        this.ctx.observeIdentifier($f5dafa803dcddca0$var$_size);
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
(0, $d4d00b2c18281bdc$export$e0440d5a58076798).set(Set, {
    makeObservable: (ctx)=>{
        return new $f5dafa803dcddca0$var$ObservableSet(ctx);
    },
    handleChange (value, identifier, newValue) {
        value.delete(identifier);
        value.add(newValue);
    },
    createClone (value) {
        return new Set(value);
    }
});



const $1133320785147c80$var$_size = Symbol("size");
class $1133320785147c80$export$db1c0901f08fc6fd extends Map {
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
        if (size !== this.map.size) this.ctx.modifyIdentifier($1133320785147c80$var$_size);
    }
    delete(key) {
        const res = this.map.delete(key);
        if (res) {
            this.ctx.modifyIdentifier(key);
            this.ctx.modifyIdentifier($1133320785147c80$var$_size);
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
            this.ctx.modifyIdentifier($1133320785147c80$var$_size);
        }
        return this;
    }
    get size() {
        return this.ctx.observeIdentifier($1133320785147c80$var$_size, this.ctx.value.size);
    }
    /** Returns an iterable of entries in the map. */ *[Symbol.iterator]() {
        this.ctx.observeIdentifier($1133320785147c80$var$_size);
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
        this.ctx.observeIdentifier($1133320785147c80$var$_size);
        return this.map.keys();
    }
    *values() {
        for (const [key, value] of this[Symbol.iterator]())yield value;
    }
}
(0, $d4d00b2c18281bdc$export$e0440d5a58076798).set(Map, {
    makeObservable: (ctx)=>{
        return new $1133320785147c80$export$db1c0901f08fc6fd(ctx);
    },
    handleChange (value, identifier, newValue) {
        value.delete(identifier);
        value.set(identifier, newValue);
    },
    createClone (value) {
        return new Map(value);
    }
});






function $5edb3eb33d1a0dbb$export$b9c7ecd090a87b14(data) {
    const [, forceRerender] = (0, $hgUW1$useState)({});
    const store = (0, $hgUW1$useMemo)(()=>(0, $d4d00b2c18281bdc$export$d1203567a167490e)(data, ()=>forceRerender({})), []);
    // Begin observing on render
    (0, $d4d00b2c18281bdc$export$aad8462122ac592b)(store);
    (0, $d4d00b2c18281bdc$export$8d21e34596265fa2)(store, {
        clone: true
    });
    // Stop observing as soon as component finishes rendering
    (0, $hgUW1$useEffect)(()=>{
        (0, $d4d00b2c18281bdc$export$8d21e34596265fa2)(store, {
            observe: false
        });
    });
    // Disable callback when component unmounts
    (0, $hgUW1$useEffect)(()=>{
        return ()=>{
            (0, $d4d00b2c18281bdc$export$aad8462122ac592b)(store);
            (0, $d4d00b2c18281bdc$export$8d21e34596265fa2)(store, {
                enabled: false
            });
        };
    }, [
        store
    ]);
    return store;
}
function $5edb3eb33d1a0dbb$export$10d01aa5776497a2(data, selector, action) {
    const [, forceRerender] = (0, $hgUW1$useState)({});
    const selectorResultRef = (0, $hgUW1$useRef)();
    const state = (0, $hgUW1$useRef)((0, $d4d00b2c18281bdc$export$d1203567a167490e)(data, (state)=>{
        return selectorResultRef.current = selector(state);
    }, (v)=>{
        action?.(v);
        forceRerender({});
    })).current;
    (0, $hgUW1$useEffect)(()=>{
        return ()=>(0, $d4d00b2c18281bdc$export$aad8462122ac592b)(state);
    }, []);
    return [
        selectorResultRef.current,
        state
    ];
}




export {$d4d00b2c18281bdc$export$d1203567a167490e as observe, $d4d00b2c18281bdc$export$debb760848ca95a as unwrap, $d4d00b2c18281bdc$export$e0440d5a58076798 as observableFactories, $d4d00b2c18281bdc$export$8d21e34596265fa2 as configure, $d4d00b2c18281bdc$export$2e6c959c16ff56b8 as select, $d4d00b2c18281bdc$export$aad8462122ac592b as reset, $379af7c1c9c51789$export$521eebe5cf3f8bee as objectAndArrayObservableFactory, $5edb3eb33d1a0dbb$export$b9c7ecd090a87b14 as useObserver, $5edb3eb33d1a0dbb$export$10d01aa5776497a2 as useObserveSelector};
//# sourceMappingURL=index.mjs.map
