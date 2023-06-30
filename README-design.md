# Keck architecture

## Overview

Keck works by taking an object and returning a replacement "observable" version of that object. To
the user, the object functions identically to the original, but internally, the object is either a
Proxy or a subclass of the original data type. As the user accesses properties of the object (or
otherwise interacts with a more complex supported data type such as a `Map` or `Set`), Keck lazily
builds a tree-like structure of data objects that mirrors the original. Each of the nodes in the
tree maintains a collection of the observers that are watching it, and when a node is modified, each
of its observers is notified.

The tree is independent of, and shared by, all the observers that are watching it. The observers
maintain information about the nodes in the tree that they are watching, but they all reference the
same nodes from the corresponding part of the tree they observe. This allows multiple observables
for the same object to stay in sync:

```ts
const data = { a: 1 }
const [store1] = createObservable(data);
const [store2] = createObservable(data);

store1.a = 2;
store2.a === 2; // true
```

The observers also maintain references to the observable versions of the objects they are observing.
When a value in the tree is modified, the corresponding observable is recreated, as well as all the
observables up that branch of the tree. This allows users to use reference equality comparisons to determine if a
value has changed.

## Data types

### DataNodes

Keck represents a given data object to be observed with a tree of **DataNode** objects. Each
DataNode represents a single object in the tree, and contains a reference to the original value, as
well as a reference to its DataNode and a map of child Identifiers and their DataNodes.

Child DataNodes are identified within their parent by an **Identifier**. An Identifier can be any
value that uniquely identifies the child DataNode within its parent (for example, for plain objects,
the Identifier is the property name; for maps, the Identifier is the key). Custom observable
factories can implement their own approaches, as long as all Identifiers for the children of a given
DataNode are unique.

The same root DataNode instance is shared by every Observer of the same object. That is, there is a
1-to-1 mapping between DataNodes and observable values. Within a DataNode tree however, it is better
to think of the DataNodes as representing an Identifier rather than the values themselves. If a
property of an observable object is replaced with another object, the DataNode itself is not
replaced, but rather its value is updated to point to the new object.

DataNode children are created lazily when an Observer accesses a property of the object.

### Observers

**Observers** are the instances that are created by `createObserver`. Each Observer represents a set
of observed DataNode child Identifiers, and a callback to be invoked when any of its observed
properties are modified. An observer can toggled to "observe" property access (or not), and its
callback can be enabled and disabled. The callback is only invoked when a property that was
previously observed is modified.

A DataNode contains a reference to all the Observer instances that are watching each of its child
Identifiers. When a child is modified, each of that child's Observer callbacks is invoked.

### ObservableContext

Every supported data type has an "observable" version that is returned by the type's corresponding
ObservableFactory. Because this observable object is an opaque type, an **ObservableContext** is
used internally to wrap around it and carry additional meta information such as the Observer and
DataNode used to create the observable.

The ObservableContext is passed to the `makeObservable` factory method.

### ObservableFactory

An ObservableFactory is an object that Keck can use to create observable values and interact with
them. The factory defines how to make an observable version of a given data value, and how to modify
and clone it. External libraries can provide support for custom data types by implementing their own
ObservableFactory.
