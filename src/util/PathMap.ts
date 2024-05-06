export type Path = any[];

type OutMap = { map?: Map<any, any> };

const pathValue = Symbol("pathValue");

export class PathMap<V> {
  private root = new Map<any, any>();

  set(path: Path, value: V): void {
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
  get(path: Path): V | undefined {
    let currentLevel: Map<any, any> | undefined = this.root;

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
  collect(path: Path, type: "ancestors" | "children" | "all" = "all"): V[] {
    let result: V[] = [];

    let currentLevel: Map<any, any> | undefined = this.root;

    const ancestors = type === "ancestors" || type === "all";

    let i = 0;
    for (; i < path.length; i++) {
      if (ancestors && currentLevel.has(pathValue)) {
        result.push(currentLevel.get(pathValue));
      }
      currentLevel = currentLevel.get(path[i]);
      if (!currentLevel) return result;
    }

    if (currentLevel.has(pathValue)) result.push(currentLevel.get(pathValue));

    if (type === "children" || type === "all") {
      this.collectChildren(currentLevel, result);
    }

    return result;
  }

  private collectChildren(entry: Map<any, any>, result: V[]) {
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
