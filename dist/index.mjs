import {useState as $hgUW1$useState, useRef as $hgUW1$useRef, useEffect as $hgUW1$useEffect} from "react";

/**
 *
 *
 *
 */ /**
 * Represents a node in an observable tree. Nodes are shared by all Observers of the same object.
 */ const $d4d00b2c18281bdc$var$rootIdentifier = Symbol("root");
/**
 * Allows looking up an Observable's ObservableContext, so that it can be unwrapped
 */ const $d4d00b2c18281bdc$var$contextForObservable = new WeakMap();
const $d4d00b2c18281bdc$export$e0440d5a58076798 = new Map();
const $d4d00b2c18281bdc$var$rootDataNodes = new WeakMap();
function $d4d00b2c18281bdc$var$getDataNode(identifier, value, parent) {
    let dataNode = parent ? parent.children.get(identifier) : $d4d00b2c18281bdc$var$rootDataNodes.get(value);
    if (dataNode) {
        dataNode.value = value;
        return dataNode;
    }
    const factory = $d4d00b2c18281bdc$export$e0440d5a58076798.get(value.constructor);
    if (!factory) return undefined;
    dataNode = {
        identifier: identifier,
        value: value,
        children: new Map(),
        parent: parent,
        factory: factory,
        observersForChild: new Map(),
        allContexts: new WeakSet()
    };
    if (parent) parent.children.set(identifier, dataNode);
    else $d4d00b2c18281bdc$var$rootDataNodes.set(value, dataNode);
    return dataNode;
}
function $d4d00b2c18281bdc$var$getObservableContext(observer, dataNode) {
    let ctx = observer.contextForNode.get(dataNode);
    // Check that the context was not previously invalidated
    if (ctx && !dataNode.allContexts.has(ctx)) {
        ctx = undefined;
        observer.contextForNode.delete(dataNode);
    }
    if (ctx) return ctx;
    ctx = {
        dataNode: dataNode,
        observer: observer,
        observable: null,
        get value () {
            return this.dataNode.value;
        },
        observeIdentifier (identifier, childValue, observeIntermediate = false) {
            // If the value is a function, bind it to its parent
            if (typeof childValue === "function") return childValue.bind(this.observable);
            function addObserver() {
                if (!observer.isObserving) return;
                let observers = dataNode.observersForChild.get(identifier);
                if (!observers) dataNode.observersForChild.set(identifier, observers = new Map());
                let selectors = observers.get(observer);
                // A non-selector observation is represented by an empty set
                const hasNonSelectorObservation = selectors && selectors.size === 0;
                if (!selectors) observers.set(observer, selectors = new Set());
                /**
         * Since non-selector observations override selector observations (i.e. they would always
         * cause the callback to be invoked), we don't need to track any additional selectors.
         * If attempting to add a selector observation, there must not be any existing non-selector
         * observations.
         */ if ($d4d00b2c18281bdc$var$activeSelector) {
                    if (!hasNonSelectorObservation) selectors.add($d4d00b2c18281bdc$var$activeSelector);
                } else selectors.clear();
                observer.disposers.add(()=>observers.delete(observer));
            }
            if (childValue) {
                // If the property is something we know how to observe, return the observable value
                const childNode = $d4d00b2c18281bdc$var$getDataNode(identifier, childValue, dataNode);
                if (childNode) {
                    if ($d4d00b2c18281bdc$var$activeSelector || observer.observeIntermediates || observeIntermediate) addObserver();
                    return $d4d00b2c18281bdc$var$getObservableContext(observer, childNode).observable;
                }
            }
            // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
            addObserver();
            return childValue;
        },
        modifyIdentifier (childIdentifier) {
            if (dataNode.parent) {
                // Get the factory for the new value
                dataNode.factory = $d4d00b2c18281bdc$export$e0440d5a58076798.get(dataNode.value.constructor);
                // Clone the value
                dataNode.value = dataNode.factory.createClone(dataNode.value);
            }
            // Invalidate Observables for all ObservableContexts of the child Identifier
            if (dataNode.children.get(childIdentifier)) dataNode.children.get(childIdentifier).allContexts = new Set();
            // Trigger all Observer callbacks for the child Identifier
            dataNode.observersForChild.get(childIdentifier)?.forEach((selectors, observer)=>{
                let isAnyDifferent = undefined;
                if (selectors.size) {
                    isAnyDifferent = false;
                    selectors.forEach((selector)=>{
                        $d4d00b2c18281bdc$var$activeSelector = selector;
                        const newValue = selector.selectorFn();
                        isAnyDifferent = isAnyDifferent || !(selector.isEqual || Object.is)(newValue, selector.lastValue);
                        selector.lastValue = newValue;
                        $d4d00b2c18281bdc$var$activeSelector = undefined;
                    });
                }
                // @ts-ignore
                if (isAnyDifferent === true || isAnyDifferent === undefined) observer.callback?.(dataNode.value, childIdentifier);
            });
            // Let the parent Observable update itself with the cloned child
            dataNode.parent?.factory.handleChange(dataNode.parent.value, dataNode.identifier, dataNode.value);
            // Call modifyIdentifier on the parent/root ObservableContext
            if (childIdentifier !== $d4d00b2c18281bdc$var$rootIdentifier) $d4d00b2c18281bdc$var$getObservableContext(observer, dataNode.parent || dataNode)?.modifyIdentifier(dataNode.identifier);
        }
    };
    ctx.observable = dataNode.factory.makeObservable(ctx);
    observer.contextForNode.set(dataNode, ctx);
    $d4d00b2c18281bdc$var$contextForObservable.set(ctx.observable, ctx);
    dataNode.allContexts.add(ctx);
    return ctx;
}
function $d4d00b2c18281bdc$export$d1203567a167490e(...args) {
    if (args.length === 2) return $d4d00b2c18281bdc$export$9e6a5ff84f57576(args[0], args[1]);
    else return $d4d00b2c18281bdc$export$6db4992b88b03a85(args[0], args[1], args[2]);
}
function $d4d00b2c18281bdc$export$9e6a5ff84f57576(data, cb) {
    // Get an existing context, if possible. This happens when an observable from another tree is
    // passed to observe().
    const ctx = $d4d00b2c18281bdc$var$contextForObservable.get(data);
    const rootNode = ctx?.dataNode || $d4d00b2c18281bdc$var$getDataNode($d4d00b2c18281bdc$var$rootIdentifier, data);
    if (!rootNode) throw new Error(`Cannot observe value ${data}`);
    const observer = {
        isObserving: true,
        observeIntermediates: false,
        callback: cb,
        disposers: new Set(),
        contextForNode: new WeakMap(),
        actions: {
            start (observeIntermediates = false) {
                observer.isObserving = true;
                observer.observeIntermediates = observeIntermediates;
            },
            stop () {
                observer.isObserving = false;
                observer.observeIntermediates = false;
            },
            disable () {
                observer.callback = undefined;
            },
            enable () {
                observer.callback = cb;
            },
            reset () {
                observer.isObserving = false;
                observer.observeIntermediates = false;
                observer.disposers.forEach((disposer)=>disposer());
                observer.disposers.clear();
            }
        }
    };
    const store = $d4d00b2c18281bdc$var$getObservableContext(observer, rootNode).observable;
    return [
        store,
        observer.actions
    ];
}
function $d4d00b2c18281bdc$export$6db4992b88b03a85(data, selector, action, compare = Object.is) {
    const [state, actions] = $d4d00b2c18281bdc$export$d1203567a167490e(data, (value, childIdentifier)=>action(selector(state), value, childIdentifier));
    $d4d00b2c18281bdc$export$2e6c959c16ff56b8(()=>selector(state), compare);
    actions.stop();
    return [
        state,
        actions
    ];
}
let $d4d00b2c18281bdc$var$activeSelector;
function $d4d00b2c18281bdc$export$2e6c959c16ff56b8(selectorFn, isEqual) {
    if ($d4d00b2c18281bdc$var$activeSelector) throw new Error("Cannot nest select() calls");
    $d4d00b2c18281bdc$var$activeSelector = {
        selectorFn: selectorFn,
        isEqual: isEqual
    };
    let lastValue = $d4d00b2c18281bdc$var$activeSelector.lastValue = selectorFn();
    $d4d00b2c18281bdc$var$activeSelector = undefined;
    return lastValue;
}
function $d4d00b2c18281bdc$export$debb760848ca95a(observable, observe = true) {
    const ctx = $d4d00b2c18281bdc$var$contextForObservable.get(observable);
    if (!ctx) return observable;
    if (observe) $d4d00b2c18281bdc$var$getObservableContext(ctx.observer, ctx.dataNode.parent || ctx.dataNode)?.observeIdentifier(ctx.dataNode.identifier, ctx.value, true);
    return ctx.dataNode.value;
}
function $d4d00b2c18281bdc$export$66b146d1d08322f9(observable) {
    return $d4d00b2c18281bdc$var$contextForObservable.get(observable)?.observer.actions;
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
                const rawValue = (0, $d4d00b2c18281bdc$export$debb760848ca95a)(value);
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
    const [store, actions] = (0, $hgUW1$useRef)((0, $d4d00b2c18281bdc$export$d1203567a167490e)(data, ()=>forceRerender({}))).current;
    // Begin observing on render
    actions.reset();
    actions.start();
    // Stop observing as soon as component finishes rendering
    (0, $hgUW1$useEffect)(()=>{
        actions.stop();
    });
    // Disable callback when component unmounts
    (0, $hgUW1$useEffect)(()=>{
        return actions.reset;
    }, []);
    return store;
}
function $5edb3eb33d1a0dbb$export$10d01aa5776497a2(data, selector, action) {
    const [, forceRerender] = (0, $hgUW1$useState)({});
    const selectorResultRef = (0, $hgUW1$useRef)();
    const [state, actions] = (0, $hgUW1$useRef)((0, $d4d00b2c18281bdc$export$d1203567a167490e)(data, (state)=>{
        return selectorResultRef.current = selector(state);
    }, (v)=>{
        action?.(v);
        forceRerender({});
    })).current;
    (0, $hgUW1$useEffect)(()=>{
        return ()=>actions.stop();
    }, []);
    return [
        selectorResultRef.current,
        state
    ];
}




export {$d4d00b2c18281bdc$export$d1203567a167490e as observe, $d4d00b2c18281bdc$export$debb760848ca95a as unwrap, $d4d00b2c18281bdc$export$e0440d5a58076798 as observableFactories, $d4d00b2c18281bdc$export$66b146d1d08322f9 as observerActions, $d4d00b2c18281bdc$export$2e6c959c16ff56b8 as select, $379af7c1c9c51789$export$521eebe5cf3f8bee as objectAndArrayObservableFactory, $5edb3eb33d1a0dbb$export$b9c7ecd090a87b14 as useObserver, $5edb3eb33d1a0dbb$export$10d01aa5776497a2 as useObserveSelector};
//# sourceMappingURL=index.mjs.map
