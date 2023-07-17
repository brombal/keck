var $8zHUo$react = require("react");

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "createObserver", () => $033a765105d89ac9$export$9e6a5ff84f57576);
$parcel$export(module.exports, "unwrap", () => $033a765105d89ac9$export$debb760848ca95a);
$parcel$export(module.exports, "configure", () => $033a765105d89ac9$export$8d21e34596265fa2);
$parcel$export(module.exports, "derive", () => $033a765105d89ac9$export$78ed5b3305815fc7);
$parcel$export(module.exports, "reset", () => $033a765105d89ac9$export$aad8462122ac592b);
$parcel$export(module.exports, "observe", () => $033a765105d89ac9$export$d1203567a167490e);
$parcel$export(module.exports, "observableFactories", () => $761d6ed052c8f17f$export$e0440d5a58076798);
$parcel$export(module.exports, "ref", () => $046eaf7a22d711d5$export$eff4d24c3ff7876e);
$parcel$export(module.exports, "objectFactory", () => $0e8c1d39dad7c1a2$export$a27ef5714f345346);
$parcel$export(module.exports, "useObserver", () => $f4ac19f6490f8500$export$b9c7ecd090a87b14);
$parcel$export(module.exports, "useObserveSelector", () => $f4ac19f6490f8500$export$10d01aa5776497a2);
const $761d6ed052c8f17f$export$e0440d5a58076798 = new Map();


const $046eaf7a22d711d5$var$_ref = Symbol("ref");
function $046eaf7a22d711d5$export$eff4d24c3ff7876e(value) {
    const factory = value && (0, $761d6ed052c8f17f$export$e0440d5a58076798).get(value.constructor);
    if (!factory) return value;
    value[$046eaf7a22d711d5$var$_ref] = true;
    return value;
}
function $046eaf7a22d711d5$export$4f9f5282de18fc69(value) {
    return !!value?.[$046eaf7a22d711d5$var$_ref];
}



// let debugCounter = 0;
/**
 * Used to look up the SharedNode for a value that is not part of any observable tree.
 */ const $033a765105d89ac9$var$rootDataNodes = new WeakMap();
const $033a765105d89ac9$var$rootIdentifier = Symbol("root");
/**
 * Used to look up an ObserverNode for an Observable, to unwrap an Observable.
 */ const $033a765105d89ac9$var$contextForObservable = new WeakMap();
/**
 * Represents a node in an observable tree. Nodes are shared by all Observers of the same object.
 * Although a SharedNode is associated with a user object, it would be more accurate to say that
 * a SharedNode represents whatever is associated with a particular child identifier on an object
 * (i.e. when `a.b = someNewValue` happens, the same SharedNode now represents `someNewValue`).
 */ class $033a765105d89ac9$var$SharedNode {
    constructor(parent, identifier, value){
        this.parent = parent;
        this.identifier = identifier;
        this.value = value;
        this.children = new Map();
        this.observersForChild = new Map();
        this.validContexts = new WeakSet();
        if (!(0, $761d6ed052c8f17f$export$e0440d5a58076798).has(value.constructor)) throw new Error(`Value "${value}" is not observable`);
        if (!parent) $033a765105d89ac9$var$rootDataNodes.set(value, this);
        else parent.children.set(identifier, this);
    }
    factory() {
        return (0, $761d6ed052c8f17f$export$e0440d5a58076798).get(this.value.constructor);
    }
}
/**
 * An Observer represents a callback that is called when a change occurs to the selected properties of its value.
 */ class $033a765105d89ac9$var$Observer {
    constructor(value, callback, sharedNode){
        this.callback = callback;
        this.disposers = new Set();
        this.config = $033a765105d89ac9$var$defaultConfig();
        this.contexts = new WeakMap();
        this.rootContext = new $033a765105d89ac9$export$ce224f6edbadb0e7(this, value, undefined, $033a765105d89ac9$var$rootIdentifier, sharedNode);
        this.contexts.set(this.rootContext.sharedNode, this.rootContext);
    }
    reset() {
        this.config = $033a765105d89ac9$var$defaultConfig();
        this.disposers.forEach((disposer)=>disposer());
        this.disposers.clear();
    }
}
class $033a765105d89ac9$export$ce224f6edbadb0e7 {
    constructor(observer, value, parent, identifier, sharedNode){
        this.observer = observer;
        this.sharedNode = sharedNode || parent?.sharedNode.children.get(identifier) || $033a765105d89ac9$var$rootDataNodes.get(value) || new $033a765105d89ac9$var$SharedNode(parent?.sharedNode, identifier, value);
        this.observable = this.sharedNode.factory().makeObservable(this);
        $033a765105d89ac9$var$contextForObservable.set(this.observable, this);
        this.sharedNode.validContexts.add(this);
    }
    get value() {
        return this.sharedNode.value;
    }
    createObservation(identifier, ignoreClones = false) {
        const sharedNode = this.sharedNode;
        const observer = this.observer;
        let observations = sharedNode.observersForChild.get(identifier);
        if (!observations) sharedNode.observersForChild.set(identifier, observations = new Map());
        let observation = observations.get(observer);
        if (!observation) observations.set(observer, observation = {
            ignoreClones: ignoreClones,
            derivatives: $033a765105d89ac9$var$activeDerivative ? new Set() : null
        });
        if ($033a765105d89ac9$var$activeDerivative && observation.derivatives) // If there's an active derivative, create a derived observation.
        observation.derivatives.add($033a765105d89ac9$var$activeDerivative);
        else {
            // Otherwise, create an unconditional/soft observation.
            // If it's unconditional, it must stay unconditional. Otherwise, can be set to "soft" if true.
            if (!ignoreClones) {
                observation.ignoreClones = false;
                // The existing derivatives are no longer needed.
                observation.derivatives = null;
            }
            this.parent?.createObservation(this.sharedNode.identifier, true);
        }
        observer.disposers.add(()=>observations.delete(observer));
    }
    observeIdentifier(identifier, childValue, observeIntermediate) {
        // If the value is a function, just bind it to its parent and return
        if (typeof childValue === "function") return childValue.bind(this.observable);
        const observer = this.observer;
        // If the value is something we know how to observe, return the observable for it
        if (childValue && !(0, $046eaf7a22d711d5$export$4f9f5282de18fc69)(childValue) && (0, $761d6ed052c8f17f$export$e0440d5a58076798).has(childValue.constructor)) {
            let childCtx = identifier === $033a765105d89ac9$var$rootIdentifier ? this : this.observer.contexts.get(this.sharedNode.children.get(identifier)); // this.children.get(identifier);
            // Check that the childCtx is present in validContexts
            if (childCtx && !childCtx.sharedNode.validContexts.has(childCtx)) childCtx = undefined;
            if (!childCtx) {
                childCtx = new $033a765105d89ac9$export$ce224f6edbadb0e7(this.observer, childValue, this, identifier, undefined);
                this.observer.contexts.set(childCtx.sharedNode, childCtx);
            }
            if (observer.config.select && ($033a765105d89ac9$var$activeDerivative || observer.config.intermediates || observeIntermediate)) this.createObservation(identifier);
            return childCtx.observable;
        }
        // If it's a non-observable (i.e. a primitive or unknown object type), just observe and return
        if (observer.config.select) this.createObservation(identifier);
        return childValue;
    }
    modifyIdentifier(childIdentifier, value, source) {
        const observer = this.observer;
        const sharedNode = this.sharedNode;
        // Invalidate any existing contexts for this identifier
        const childDataNode = sharedNode.children.get(childIdentifier);
        if (childDataNode) {
            if (!value || typeof value !== "object") // A SharedNode exists for childIdentifier, but the value is being deleted or replaced with a primitive;
            // remove the child SharedNode from the tree.
            childDataNode.parent?.children.delete(childIdentifier);
            else if (childDataNode.value !== value) {
                // A SharedNode exists for childIdentifier, but the value is being replaced with a new object;
                // update the child SharedNode's value and invalidate all contexts for it.
                childDataNode.value = value;
                childDataNode.validContexts = new WeakSet();
                childDataNode.children.clear();
            }
        }
        // Clone the value if enabled and not the root
        if (observer.config.clone && sharedNode.parent) {
            sharedNode.value = sharedNode.factory().createClone(sharedNode.value);
            sharedNode.validContexts = new WeakSet();
        }
        // Trigger all Observer callbacks for the child Identifier
        sharedNode.observersForChild.get(childIdentifier)?.forEach((observation, observer)=>{
            let triggerCallback = false;
            if (observation.derivatives) for (const derivative of observation.derivatives){
                $033a765105d89ac9$var$activeDerivative = derivative;
                const newValue = derivative.deriveFn();
                triggerCallback = triggerCallback || !(derivative.isEqual || Object.is)(newValue, derivative.lastValue);
                derivative.lastValue = newValue;
                $033a765105d89ac9$var$activeDerivative = undefined;
            }
            if (observation.ignoreClones) // only trigger soft observables if this is a direct modification
            triggerCallback ||= !source;
            if (!observation.ignoreClones && !observation.derivatives) triggerCallback = true;
            if (observer.config.enabled && triggerCallback) observer.callback?.(source?.[0].value || sharedNode.value, source?.[1] || childIdentifier);
        });
        // Update the parent Observable with the cloned child
        sharedNode.parent?.factory().handleChange(sharedNode.parent.value, sharedNode.identifier, sharedNode.value);
        // Call modifyIdentifier on the parent/root ObserverNode
        if (this.parent) this.parent.modifyIdentifier(sharedNode.identifier, sharedNode.value, source || [
            sharedNode,
            childIdentifier
        ]);
        else if (childIdentifier !== $033a765105d89ac9$var$rootIdentifier) this.modifyIdentifier($033a765105d89ac9$var$rootIdentifier, sharedNode.value, source || [
            sharedNode,
            childIdentifier
        ]);
    }
    get parent() {
        return this.observer.contexts.get(this.sharedNode.parent);
    }
}
function $033a765105d89ac9$export$9e6a5ff84f57576(...args) {
    if (args.length === 2) return $033a765105d89ac9$var$createSimpleObserver(args[0], args[1]);
    else return $033a765105d89ac9$var$createdDerivedObserver(args[0], args[1], args[2]);
}
function $033a765105d89ac9$var$createSimpleObserver(data, cb) {
    // Get an existing context and SharedNode, if possible. This happens when an observable from another tree is
    // passed to observe(). Otherwise, it will create a new root SharedNode.
    const ctx = $033a765105d89ac9$var$contextForObservable.get(data);
    const observer = new $033a765105d89ac9$var$Observer($033a765105d89ac9$export$debb760848ca95a(data), cb, ctx?.sharedNode);
    return observer.rootContext.observable;
}
function $033a765105d89ac9$var$createdDerivedObserver(data, deriveFn, action, compare = Object.is) {
    const state = $033a765105d89ac9$var$createSimpleObserver(data, (value, childIdentifier)=>action(deriveFn(state), value, childIdentifier));
    $033a765105d89ac9$export$78ed5b3305815fc7(()=>deriveFn(state), compare);
    $033a765105d89ac9$export$8d21e34596265fa2(state, {
        select: false
    });
    return state;
}
let $033a765105d89ac9$var$activeDerivative;
function $033a765105d89ac9$export$78ed5b3305815fc7(deriveFn, isEqual) {
    if ($033a765105d89ac9$var$activeDerivative) return deriveFn();
    $033a765105d89ac9$var$activeDerivative = {
        deriveFn: deriveFn,
        isEqual: isEqual
    };
    const value = $033a765105d89ac9$var$activeDerivative.lastValue = deriveFn();
    $033a765105d89ac9$var$activeDerivative = undefined;
    return value;
}
const $033a765105d89ac9$var$defaultConfig = ()=>({
        select: true,
        clone: false,
        intermediates: false,
        enabled: true
    });
function $033a765105d89ac9$export$8d21e34596265fa2(observable, options) {
    const ctx = $033a765105d89ac9$var$contextForObservable.get(observable);
    if (!ctx || ctx?.observer.rootContext !== ctx) throw new Error(`Cannot configure non-observable ${observable}`);
    Object.assign(ctx.observer.config, options);
}
function $033a765105d89ac9$export$aad8462122ac592b(observable) {
    const ctx = $033a765105d89ac9$var$contextForObservable.get(observable);
    if (!ctx || ctx?.observer.rootContext !== ctx) throw new Error(`Cannot reset non-observable ${observable}`);
    ctx.observer.reset();
}
function $033a765105d89ac9$var$getObservableContext(observable) {
    const ctx = $033a765105d89ac9$var$contextForObservable.get(observable);
    if (!ctx) return null;
    if (ctx.sharedNode && !ctx.sharedNode.validContexts.has(ctx)) throw new Error(`You are using a stale reference to an observable value.`);
    return ctx;
}
function $033a765105d89ac9$export$debb760848ca95a(observable) {
    const ctx = $033a765105d89ac9$var$getObservableContext(observable);
    return ctx ? ctx.sharedNode.value : observable;
}
function $033a765105d89ac9$export$d1203567a167490e(observable) {
    const ctx = $033a765105d89ac9$var$getObservableContext(observable);
    if (!ctx) return observable;
    // Unwrapping can only create an observation in select mode
    if (ctx.observer.config.select) (ctx.parent || ctx).observeIdentifier(ctx.sharedNode.identifier, ctx.value, true);
    return ctx.sharedNode.value;
}



const $0e8c1d39dad7c1a2$export$a27ef5714f345346 = {
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
                const rawValue = (0, $033a765105d89ac9$export$debb760848ca95a)(value);
                const oldValue = Reflect.get(ctx.value, prop, ctx.value);
                if (oldValue === rawValue) return true;
                if (Array.isArray(ctx.value)) {
                    const arrayLength = ctx.value.length;
                    const setResult = Reflect.set(ctx.value, prop, rawValue, ctx.value);
                    if (arrayLength !== ctx.value.length) ctx.modifyIdentifier("length");
                    if (prop !== "length") ctx.modifyIdentifier(prop, rawValue);
                    return setResult;
                }
                const result = Reflect.set(ctx.value, prop, rawValue, ctx.value);
                ctx.modifyIdentifier(prop, rawValue);
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
(0, $761d6ed052c8f17f$export$e0440d5a58076798).set(Object, $0e8c1d39dad7c1a2$export$a27ef5714f345346);
(0, $761d6ed052c8f17f$export$e0440d5a58076798).set(Array, $0e8c1d39dad7c1a2$export$a27ef5714f345346);



const $f48a0b5c6473b7e6$var$_size = Symbol("size");
class $f48a0b5c6473b7e6$var$ObservableSet extends Set {
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
        if (size !== this.set.size) this.ctx.modifyIdentifier($f48a0b5c6473b7e6$var$_size);
        return this;
    }
    clear() {
        const size = this.set.size;
        this.set.clear();
        if (size !== this.set.size) this.ctx.modifyIdentifier($f48a0b5c6473b7e6$var$_size);
    }
    delete(value) {
        const res = this.set.delete(value);
        if (res) this.ctx.modifyIdentifier($f48a0b5c6473b7e6$var$_size);
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
        this.ctx.observeIdentifier($f48a0b5c6473b7e6$var$_size);
        return this.set.has(value);
    }
    get size() {
        return this.ctx.observeIdentifier($f48a0b5c6473b7e6$var$_size, this.set.size);
    }
    *[Symbol.iterator]() {
        this.ctx.observeIdentifier($f48a0b5c6473b7e6$var$_size);
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
(0, $761d6ed052c8f17f$export$e0440d5a58076798).set(Set, {
    makeObservable: (ctx)=>{
        return new $f48a0b5c6473b7e6$var$ObservableSet(ctx);
    },
    handleChange (value, identifier, newValue) {
        value.delete(identifier);
        value.add(newValue);
    },
    createClone (value) {
        return new Set(value);
    }
});



const $7175e756f1c09916$var$_size = Symbol("size");
class $7175e756f1c09916$export$db1c0901f08fc6fd extends Map {
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
        if (size !== this.map.size) this.ctx.modifyIdentifier($7175e756f1c09916$var$_size);
    }
    delete(key) {
        const res = this.map.delete(key);
        if (res) {
            this.ctx.modifyIdentifier(key);
            this.ctx.modifyIdentifier($7175e756f1c09916$var$_size);
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
            this.ctx.modifyIdentifier(key, value);
            this.ctx.modifyIdentifier($7175e756f1c09916$var$_size);
        }
        return this;
    }
    get size() {
        return this.ctx.observeIdentifier($7175e756f1c09916$var$_size, this.ctx.value.size);
    }
    /** Returns an iterable of entries in the map. */ *[Symbol.iterator]() {
        this.ctx.observeIdentifier($7175e756f1c09916$var$_size);
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
        this.ctx.observeIdentifier($7175e756f1c09916$var$_size);
        return this.map.keys();
    }
    *values() {
        for (const [key, value] of this[Symbol.iterator]())yield value;
    }
}
(0, $761d6ed052c8f17f$export$e0440d5a58076798).set(Map, {
    makeObservable: (ctx)=>{
        return new $7175e756f1c09916$export$db1c0901f08fc6fd(ctx);
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
    const ref = (0, $8zHUo$react.useRef)();
    if (!ref.current) ref.current = (0, $033a765105d89ac9$export$9e6a5ff84f57576)(data, ()=>forceRerender({}));
    const state = ref.current;
    // Begin observing on render
    (0, $033a765105d89ac9$export$aad8462122ac592b)(state);
    (0, $033a765105d89ac9$export$8d21e34596265fa2)(state, {
        clone: true
    });
    // Stop observing as soon as component finishes rendering
    (0, $8zHUo$react.useEffect)(()=>{
        (0, $033a765105d89ac9$export$8d21e34596265fa2)(state, {
            select: false
        });
    });
    // Disable callback when component unmounts
    (0, $8zHUo$react.useEffect)(()=>{
        return ()=>{
            (0, $033a765105d89ac9$export$aad8462122ac592b)(state);
            (0, $033a765105d89ac9$export$8d21e34596265fa2)(state, {
                enabled: false
            });
        };
    }, [
        state
    ]);
    return state;
}
function $f4ac19f6490f8500$export$10d01aa5776497a2(data, selector, action) {
    const [, forceRerender] = (0, $8zHUo$react.useState)({});
    const selectorResultRef = (0, $8zHUo$react.useRef)();
    const state = (0, $8zHUo$react.useRef)((0, $033a765105d89ac9$export$9e6a5ff84f57576)(data, (state)=>{
        return selectorResultRef.current = selector(state);
    }, (v)=>{
        action?.(v);
        forceRerender({});
    })).current;
    (0, $8zHUo$react.useEffect)(()=>{
        return ()=>(0, $033a765105d89ac9$export$aad8462122ac592b)(state);
    }, []);
    return [
        selectorResultRef.current,
        state
    ];
}




//# sourceMappingURL=index.cjs.map
