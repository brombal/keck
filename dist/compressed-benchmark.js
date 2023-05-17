var e=require("react");function t(e,t,r,s){Object.defineProperty(e,t,{get:r,set:s,enumerable:!0,configurable:!0})}var r={};t(r,"observe",(()=>f)),t(r,"unwrap",(()=>y)),t(r,"observableFactories",(()=>i)),t(r,"configure",(()=>h)),t(r,"select",(()=>u)),t(r,"reset",(()=>b)),t(r,"objectAndArrayObservableFactory",(()=>g)),t(r,"useObserver",(()=>S)),t(r,"useObserveSelector",(()=>C));const s=Symbol("root"),o=new WeakMap,i=new Map,n=new WeakMap;function a(e,t,r){const s=i.get(t.constructor);if(!s)return;let o=r?r.children.get(e):n.get(t);return o?(o.value=t,o):(o={identifier:e,value:t,children:new Map,parent:r,factory:s,observersForChild:new Map,validContexts:new WeakSet},r&&r.children.set(e,o),n.set(t,o),o)}function c(e,t,r){let s=t.observersForChild.get(e);s||t.observersForChild.set(e,s=new Map);let o=s.get(r);const i=o&&0===o.size;o||s.set(r,o=new Set),d?i||o.add(d):o.clear(),r.disposers.add((()=>s.delete(r)))}function l(e,t){let r=e.contextForNode.get(t);return r&&!t.validContexts.has(r)&&(r=void 0,e.contextForNode.delete(t)),r||(r={root:!1,dataNode:t,observer:e,observable:null,get value(){return this.dataNode.value},observeIdentifier(r,s,o=!1){if("function"==typeof s)return s.bind(this.observable);const i=s&&a(r,s,t);return i?(e.config.observe&&(d||e.config.intermediates||o)&&c(r,t,e),l(e,i).observable):(e.config.observe&&c(r,t,e),s)},modifyIdentifier(r,o){e.config.clone&&t.parent&&(t.value=t.factory.createClone(t.value)),!e.config.clone&&o||!t.children.get(r)||(t.children.get(r).validContexts=new Set),t.observersForChild.get(r)?.forEach(((e,s)=>{let i;if(e.size){i=!1;for(const t of e){d=t;const e=t.selectorFn();i=i||!(t.isEqual||Object.is)(e,t.lastValue),t.lastValue=e,d=void 0}}!s.config.enabled||!0!==i&&void 0!==i||s.callback?.(o?.[0].value||t.value,o?.[1]||r)})),t.parent?.factory.handleChange(t.parent.value,t.identifier,t.value),r!==s&&l(e,t.parent||t)?.modifyIdentifier(t.identifier,o||[t,r])}},r.observable=t.factory.makeObservable(r),e.contextForNode.set(t,r),o.set(r.observable,r),t.validContexts.add(r),r)}function f(...e){return 2===e.length?function(e,t){const r=o.get(e)?.dataNode||a(s,e);if(!r)throw new Error(`Cannot observe value ${e}`);const i=l({callback:t,disposers:new Set,contextForNode:new WeakMap,config:v()},r);return i.root=!0,i.observable}(e[0],e[1]):function(e,t,r,s=Object.is){const o=f(e,((e,s)=>r(t(o),e,s)));return u((()=>t(o)),s),h(o,{observe:!1}),o}(e[0],e[1],e[2])}let d;function u(e,t){if(d)return e();d={selectorFn:e,isEqual:t};const r=d.lastValue=e();return d=void 0,r}const v=()=>({observe:!0,clone:!1,intermediates:!1,enabled:!0});function h(e,t){const r=o.get(e);if(!r?.root)throw new Error(`Cannot configure non-observable ${e}`);Object.assign(r.observer.config,t)}function b(e){const t=o.get(e);if(!t?.root)throw new Error(`Cannot reset non-observable ${e}`);Object.assign(t.observer.config,v()),t.observer.disposers.forEach((e=>e())),t.observer.disposers.clear()}function y(e,t=!0){const r=o.get(e);return r?(t&&r.observer.config.observe&&l(r.observer,r.dataNode.parent||r.dataNode)?.observeIdentifier(r.dataNode.identifier,r.value,!0),r.dataNode.value):e}const g={makeObservable:e=>new Proxy(e.value,{getPrototypeOf:()=>Reflect.getPrototypeOf(e.value),getOwnPropertyDescriptor:(t,r)=>(e.observeIdentifier(r),Reflect.getOwnPropertyDescriptor(e.value,r)),ownKeys:()=>Reflect.ownKeys(e.value),has:(t,r)=>(e.observeIdentifier(r),Reflect.has(e.value,r)),get(t,r){if("toJSON"===r)return()=>e.value;const s=Reflect.get(e.value,r,e.value);return e.observeIdentifier(r,s)},set(t,r,s){const o=y(s,!1);if(Reflect.get(e.value,r,e.value)===o)return!0;if(Array.isArray(e.value)){const t=e.value.length,s=Reflect.set(e.value,r,o,e.value);return t!==e.value.length&&e.modifyIdentifier("length"),"length"!==r&&e.modifyIdentifier(r),s}const i=Reflect.set(e.value,r,o,e.value);return e.modifyIdentifier(r),i},deleteProperty(t,r){const s=Reflect.deleteProperty(e.value,r);return s&&e.modifyIdentifier(r),s}}),handleChange(e,t,r){e[t]=r},createClone(e){if(Array.isArray(e))return[...e];const t={...e};return Object.setPrototypeOf(t,Object.getPrototypeOf(e)),t}};i.set(Object,g),i.set(Array,g);const p=Symbol("size");class m extends Set{constructor(e){super(),this.ctx=e}get set(){return this.ctx.value}add(e){const t=this.set.size;return this.set.add(e),t!==this.set.size&&this.ctx.modifyIdentifier(p),this}clear(){const e=this.set.size;this.set.clear(),e!==this.set.size&&this.ctx.modifyIdentifier(p)}delete(e){const t=this.set.delete(e);return t&&this.ctx.modifyIdentifier(p),t}forEach(e,t){this.set.forEach(((r,s)=>{const o=this.ctx.observeIdentifier(r,r);e.call(t,o,o,this)}),t),this.size}has(e){return this.ctx.observeIdentifier(p),this.set.has(e)}get size(){return this.ctx.observeIdentifier(p,this.set.size)}*[Symbol.iterator](){this.ctx.observeIdentifier(p);for(const e of this.set)yield this.ctx.observeIdentifier(e,e)}*entries(){for(const e of this[Symbol.iterator]())yield[e,e]}keys(){return this[Symbol.iterator]()}values(){return this[Symbol.iterator]()}}i.set(Set,{makeObservable:e=>new m(e),handleChange(e,t,r){e.delete(t),e.add(r)},createClone:e=>new Set(e)});const I=Symbol("size");class w extends Map{constructor(e){super(),this.ctx=e}get map(){return this.ctx.value}clear(){const e=this.map.size;this.map.clear(),e!==this.map.size&&this.ctx.modifyIdentifier(I)}delete(e){const t=this.map.delete(e);return t&&(this.ctx.modifyIdentifier(e),this.ctx.modifyIdentifier(I)),t}forEach(e,t){this.map.forEach(((r,s)=>{const o=this.ctx.observeIdentifier(s,r);e.call(t,o,s,this)}),t),this.size}get(e){return this.ctx.observeIdentifier(e),this.map.get(e)}has(e){return this.ctx.observeIdentifier(e),this.map.has(e)}set(e,t){const r=this.map.size;return this.map.set(e,t),r!==this.map.size&&(this.ctx.modifyIdentifier(e),this.ctx.modifyIdentifier(I)),this}get size(){return this.ctx.observeIdentifier(I,this.ctx.value.size)}*[Symbol.iterator](){this.ctx.observeIdentifier(I);for(const[e,t]of this.map){const r=this.ctx.observeIdentifier(e,t);yield[e,r]}}entries(){return this[Symbol.iterator]()}keys(){return this.ctx.observeIdentifier(I),this.map.keys()}*values(){for(const[e,t]of this[Symbol.iterator]())yield t}}i.set(Map,{makeObservable:e=>new w(e),handleChange(e,t,r){e.delete(t),e.set(t,r)},createClone:e=>new Map(e)});var O={};function S(t){const[,r]=(0,e.useState)({}),s=(0,e.useMemo)((()=>f(t,(()=>r({})))),[]);return b(s),h(s,{clone:!0}),(0,e.useEffect)((()=>{h(s,{observe:!1})})),(0,e.useEffect)((()=>()=>{b(s),h(s,{enabled:!1})}),[s]),s}function C(t,r,s){const[,o]=(0,e.useState)({}),i=(0,e.useRef)(),n=(0,e.useRef)(f(t,(e=>i.current=r(e)),(e=>{s?.(e),o({})}))).current;return(0,e.useEffect)((()=>()=>b(n)),[]),[i.current,n]}t(O,"useObserver",(()=>S)),t(O,"useObserveSelector",(()=>C)),x(r),x(O);