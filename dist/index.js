var $8zHUo$react = require("react");

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "createObserver", () => $ba335ef6462386dd$export$9e6a5ff84f57576);
$parcel$export(module.exports, "unwrap", () => $ba335ef6462386dd$export$debb760848ca95a);
$parcel$export(module.exports, "observableFactories", () => $ba335ef6462386dd$export$e0440d5a58076798);
$parcel$export(module.exports, "objectAndArrayObservableFactory", () => $7ac2d515680cf951$export$521eebe5cf3f8bee);
$parcel$export(module.exports, "useObservable", () => $f4ac19f6490f8500$export$262b072b280a540c);
const $ba335ef6462386dd$var$rootIdentifier = Symbol("root");
const $ba335ef6462386dd$export$e0440d5a58076798 = new Map();
const $ba335ef6462386dd$export$31553aaa555c1514 = Symbol("getContext");
const $ba335ef6462386dd$var$rootSharedRefs = new Map();
function $ba335ef6462386dd$var$getSharedRef(identifier, value, parent) {
    let sharedRef = parent ? parent.children.get(identifier) : $ba335ef6462386dd$var$rootSharedRefs.get(value);
    if (sharedRef) {
        sharedRef.value = value;
        return sharedRef;
    }
    const factory = $ba335ef6462386dd$export$e0440d5a58076798.get(value.constructor);
    if (!factory) return undefined;
    sharedRef = {
        identifier: identifier,
        value: value,
        children: new Map(),
        parent: parent,
        factory: factory,
        observersForId: new Map(),
        contextForObserver: new Map()
    };
    if (parent) parent.children.set(identifier, sharedRef);
    else {
        sharedRef.__root = true;
        $ba335ef6462386dd$var$rootSharedRefs.set(value, sharedRef);
    }
    return sharedRef;
}
function $ba335ef6462386dd$var$getObservableContext(observer, sharedRef) {
    let ctx = sharedRef.contextForObserver.get(observer);
    if (ctx) return ctx;
    let observable;
    ctx = {
        sharedRef: sharedRef,
        observer: observer,
        get value () {
            return this.sharedRef.value;
        },
        get observable () {
            return observable || (observable = this.sharedRef.factory.makeObservable(this));
        },
        invalidateObservable () {
            observable = undefined;
        },
        observeIdentifier (identifier, childValue, observeIntermediate = false) {
            // If the value is a function, bind it to its parent
            if (typeof childValue === "function") return childValue.bind(this.observable);
            function addObserver() {
                if (!observer.isObserving) return;
                let observers = sharedRef.observersForId.get(identifier);
                if (!observers) sharedRef.observersForId.set(identifier, observers = new Set());
                observers.add(observer);
                observer.disposers.add(()=>observers.delete(observer));
            }
            if (childValue) {
                // If the property is something we know how to observe, return the observable value
                const childSharedRef = $ba335ef6462386dd$var$getSharedRef(identifier, childValue, sharedRef); // TODO: sharedRef.getChildSharedRef(identifier, childValue); ?
                if (childSharedRef) {
                    if (observeIntermediate) addObserver();
                    return $ba335ef6462386dd$var$getObservableContext(observer, childSharedRef).observable;
                }
            }
            // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
            addObserver();
            return childValue;
        },
        modifyIdentifier (childIdentifier) {
            if (sharedRef.parent) {
                // Get the factory for the new value
                sharedRef.factory = $ba335ef6462386dd$export$e0440d5a58076798.get(sharedRef.value.constructor);
                // Clone the value
                sharedRef.value = sharedRef.factory.createClone(sharedRef.value);
            }
            // Invalidate Observables for all ObservableContexts of the child Identifier
            sharedRef.children.get(childIdentifier)?.contextForObserver.forEach((ctx)=>ctx.invalidateObservable());
            // Trigger all Observer callbacks for the child Identifier
            sharedRef.observersForId.get(childIdentifier)?.forEach((observer)=>{
                observer.callback?.(sharedRef.value, childIdentifier);
            });
            // Let the parent Observable update itself with the cloned child
            sharedRef.parent?.factory.handleChange(sharedRef.parent.value, sharedRef.identifier, sharedRef.value);
            // Call modifyIdentifier on the parent/root ObservableContext
            if (sharedRef.parent) sharedRef.parent?.contextForObserver.get(observer).modifyIdentifier(sharedRef.identifier);
            else if (childIdentifier !== $ba335ef6462386dd$var$rootIdentifier) sharedRef.contextForObserver.get(observer).modifyIdentifier($ba335ef6462386dd$var$rootIdentifier);
        }
    };
    sharedRef.contextForObserver.set(observer, ctx);
    return ctx;
}
function $ba335ef6462386dd$export$9e6a5ff84f57576(data, callback) {
    data = $ba335ef6462386dd$export$debb760848ca95a(data, false);
    const rootSharedRef = $ba335ef6462386dd$var$getSharedRef($ba335ef6462386dd$var$rootIdentifier, data);
    if (!rootSharedRef) throw new Error(`Cannot observe value ${data}`);
    const observer = {
        isObserving: true,
        callback: callback,
        disposers: new Set()
    };
    return {
        store: $ba335ef6462386dd$var$getObservableContext(observer, rootSharedRef).observable,
        observe () {
            observer.isObserving = true;
        },
        unobserve () {
            observer.isObserving = false;
        },
        reset () {
            observer.disposers.forEach((disposer)=>disposer());
            observer.disposers.clear();
        },
        disable () {
            observer.isObserving = false;
            observer.callback = undefined;
        },
        enable () {
            observer.callback = callback;
        }
    };
}
function $ba335ef6462386dd$export$debb760848ca95a(observable, observe = true) {
    const ctx = observable?.[$ba335ef6462386dd$export$31553aaa555c1514]?.();
    if (!ctx) return observable;
    if (observe) {
        if (ctx.sharedRef.parent) ctx.sharedRef.parent.contextForObserver.get(ctx.observer)?.observeIdentifier(ctx.sharedRef.identifier, ctx.sharedRef.value, true);
        else ctx.sharedRef.contextForObserver.get(ctx.observer)?.observeIdentifier($ba335ef6462386dd$var$rootIdentifier, observable);
    }
    return ctx.sharedRef.value;
} /**
 * When an identifier is modified, I need to get all the observers that are observing that identifier, and trigger each callback.
 * I don't want to iterate every existing observer.
 * 1. Get the context's shared ref
 * 2. Use the identifier being modified to get its Set of observers
 * 3. Call each observer's callback
 *
 * When an observation is created:
 * 1. Get the context's shared ref
 * 2. Use the identifier being observed to get its Set of observers
 * 3. Add the observer to the Set
 * 4. Add a cleanup function to the observer that will remove it from the Set on reset
 *
 * When an observer is reset, I need to clear out all of the observers that are observing that identifier for each shared ref.
 * 1. Get the observer
 * 2. Run all the cleanup functions
 *
 * An observable instance needs to compare equal to itself when its underlying value hasn't changed (for things like React's useEffect dependencies)
 *
 */ 


const $7ac2d515680cf951$export$521eebe5cf3f8bee = {
    makeObservable: (ctx)=>{
        return new Proxy(// The target of the proxy is not relevant since we always get/set values directly on the context value object.
        // We only use the context object to make debugging easier.
        ctx, {
            has (_, prop) {
                if (prop === (0, $ba335ef6462386dd$export$31553aaa555c1514)) return true;
                return Reflect.has(ctx.value, prop);
            },
            get (_, prop) {
                if (prop === (0, $ba335ef6462386dd$export$31553aaa555c1514)) return ()=>ctx;
                const value = Reflect.get(ctx.value, prop, ctx.value);
                return ctx.observeIdentifier(prop, value);
            },
            set (_, prop, value) {
                if (prop === (0, $ba335ef6462386dd$export$31553aaa555c1514)) return true;
                const rawValue = (0, $ba335ef6462386dd$export$debb760848ca95a)(value);
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
            deleteProperty (_, p) {
                const result = Reflect.deleteProperty(ctx.value, p);
                ctx.modifyIdentifier(p);
                return result;
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
(0, $ba335ef6462386dd$export$e0440d5a58076798).set(Object, $7ac2d515680cf951$export$521eebe5cf3f8bee);
(0, $ba335ef6462386dd$export$e0440d5a58076798).set(Array, $7ac2d515680cf951$export$521eebe5cf3f8bee);



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
        // this.ctx.childContexts.clear();
        if (size !== this.set.size) this.ctx.modifyIdentifier($ac37ca25d8d2c0b4$var$_size);
    }
    delete(value) {
        const size = this.set.size;
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
    [(0, $ba335ef6462386dd$export$31553aaa555c1514)]() {
        return this.ctx;
    }
}
(0, $ba335ef6462386dd$export$e0440d5a58076798).set(Set, {
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
        if (res) this.ctx.modifyIdentifier(key);
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
        if (size !== this.map.size) this.ctx.modifyIdentifier(key);
        return this;
    }
    get size() {
        return this.ctx.observeIdentifier($5074f1447801d804$var$_size, this.map.size);
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
    [(0, $ba335ef6462386dd$export$31553aaa555c1514)]() {
        return this.ctx;
    }
}
(0, $ba335ef6462386dd$export$e0440d5a58076798).set(Map, {
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






function $f4ac19f6490f8500$export$262b072b280a540c(data) {
    const [, forceRerender] = (0, $8zHUo$react.useState)({});
    const { store: store , reset: reset , observe: observe , unobserve: unobserve  } = (0, $8zHUo$react.useRef)((0, $ba335ef6462386dd$export$9e6a5ff84f57576)(data, ()=>forceRerender({}))).current;
    // Begin observing on render
    reset();
    observe();
    // Stop observing as soon as component finishes rendering
    (0, $8zHUo$react.useEffect)(()=>{
        unobserve();
    });
    // Disable callback when component unmounts
    (0, $8zHUo$react.useLayoutEffect)(()=>{
        return ()=>reset();
    }, []);
    return {
        store: store,
        observe: observe,
        unobserve: unobserve
    };
}




//# sourceMappingURL=index.js.map
