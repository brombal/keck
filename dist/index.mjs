import {useState as $hgUW1$useState, useRef as $hgUW1$useRef, useEffect as $hgUW1$useEffect, useLayoutEffect as $hgUW1$useLayoutEffect} from "react";

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
                if (!observers) dataNode.observersForChild.set(identifier, observers = new Set());
                observers.add(observer);
                observer.disposers.add(()=>observers.delete(observer));
            }
            if (childValue) {
                // If the property is something we know how to observe, return the observable value
                const childNode = $d4d00b2c18281bdc$var$getDataNode(identifier, childValue, dataNode);
                if (childNode) {
                    if (observeIntermediate) addObserver();
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
            dataNode.observersForChild.get(childIdentifier)?.forEach((observer)=>{
                observer.callback?.(dataNode.value, childIdentifier);
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
    // Get an existing context, if possible. This happens when an observable from another tree is passed to observe().
    const ctx = $d4d00b2c18281bdc$var$contextForObservable.get(data);
    const rootNode = ctx?.dataNode || $d4d00b2c18281bdc$var$getDataNode($d4d00b2c18281bdc$var$rootIdentifier, data);
    if (!rootNode) throw new Error(`Cannot observe value ${data}`);
    const observer = {
        isObserving: true,
        callback: cb,
        disposers: new Set(),
        contextForNode: new WeakMap()
    };
    const store = $d4d00b2c18281bdc$var$getObservableContext(observer, rootNode).observable;
    return [
        store,
        {
            start () {
                observer.isObserving = true;
            },
            stop () {
                observer.isObserving = false;
            },
            disable () {
                observer.callback = undefined;
            },
            enable () {
                observer.callback = cb;
            },
            reset () {
                observer.disposers.forEach((disposer)=>disposer());
                observer.disposers.clear();
            }
        }
    ];
}
function $d4d00b2c18281bdc$export$6db4992b88b03a85(data, selector, action) {
    const [state, actions] = $d4d00b2c18281bdc$export$d1203567a167490e(data, ()=>{
        const newSelectorResult = selector(state);
        let isEqual = false;
        let newResult;
        if (Array.isArray(newSelectorResult) && !$d4d00b2c18281bdc$var$contextForObservable.has(newSelectorResult)) {
            newResult = newSelectorResult.map((v)=>$d4d00b2c18281bdc$export$debb760848ca95a(v, false));
            isEqual = prevResult.length === newResult.length && newResult.every((v, i)=>prevResult[i] === v);
        } else {
            newResult = $d4d00b2c18281bdc$export$debb760848ca95a(newSelectorResult, false);
            isEqual = newResult === prevResult;
        }
        if (!isEqual) action(newResult, data);
        prevResult = newResult;
    });
    const selectorResult = selector(state);
    let prevResult;
    // If the selector returns a new, non-observable array, unwrap each element to observe it individually.
    if (Array.isArray(selectorResult) && !$d4d00b2c18281bdc$var$contextForObservable.has(selectorResult)) prevResult = selectorResult.map((v)=>$d4d00b2c18281bdc$export$debb760848ca95a(v));
    else prevResult = $d4d00b2c18281bdc$export$debb760848ca95a(selectorResult);
    return [
        state,
        ()=>{
            actions.stop();
            actions.disable();
            actions.reset();
        }
    ];
}
function $d4d00b2c18281bdc$export$debb760848ca95a(observable, observe = true) {
    const ctx = $d4d00b2c18281bdc$var$contextForObservable.get(observable);
    if (!ctx) return observable;
    if (observe) $d4d00b2c18281bdc$var$getObservableContext(ctx.observer, ctx.dataNode.parent || ctx.dataNode)?.observeIdentifier(ctx.dataNode.identifier, ctx.value, true);
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
    const [store, { reset: reset , start: start , stop: stop  }] = (0, $hgUW1$useRef)((0, $d4d00b2c18281bdc$export$d1203567a167490e)(data, ()=>forceRerender({}))).current;
    // Begin observing on render
    reset();
    start();
    // Stop observing as soon as component finishes rendering
    (0, $hgUW1$useEffect)(()=>{
        stop();
    });
    // Disable callback when component unmounts
    (0, $hgUW1$useLayoutEffect)(()=>{
        return ()=>reset();
    }, []);
    return [
        store,
        {
            start: start,
            stop: stop
        }
    ];
}




export {$d4d00b2c18281bdc$export$d1203567a167490e as observe, $d4d00b2c18281bdc$export$debb760848ca95a as unwrap, $d4d00b2c18281bdc$export$e0440d5a58076798 as observableFactories, $379af7c1c9c51789$export$521eebe5cf3f8bee as objectAndArrayObservableFactory, $5edb3eb33d1a0dbb$export$b9c7ecd090a87b14 as useObserver};
//# sourceMappingURL=index.mjs.map
