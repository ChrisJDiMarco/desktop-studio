/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * TQL (Thinklet Query Language) shim.
 *
 * Each static method returns an *operation descriptor* — a plain object that
 * describes the mutation.  The host page's `updateContent` callback receives
 * these descriptors and applies them to the in-memory content store (and
 * persists to localStorage).
 */

export interface TQLOperation {
  type: string;
  path: string;
  value?: any;
  criteria?: any;
  id?: string;
  fieldPath?: string;
  position?: number;
  amount?: number;
  ops?: Record<string, any>;
}

function getByPath(obj: any, path: string): any {
  const segments = parsePath(path);
  let cur = obj;
  for (const seg of segments) {
    if (cur == null) return undefined;
    cur = cur[seg];
  }
  return cur;
}

function setByPath(obj: any, path: string, value: any): any {
  const clone = structuredClone(obj);
  const segments = parsePath(path);
  let cur = clone;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (cur[seg] == null) {
      cur[seg] = typeof segments[i + 1] === "number" ? [] : {};
    }
    cur = cur[seg];
  }
  cur[segments[segments.length - 1]] = value;
  return clone;
}

function parsePath(path: string): (string | number)[] {
  const result: (string | number)[] = [];
  for (const seg of path.split(".")) {
    const bracketMatch = seg.match(/^\$\[(\w+)=(.+)\]$/);
    if (bracketMatch) {
      result.push(`$[${bracketMatch[1]}=${bracketMatch[2]}]`);
    } else {
      const num = Number(seg);
      result.push(Number.isNaN(num) ? seg : num);
    }
  }
  return result;
}

function resolveArrayFilterPath(obj: any, path: string): { parent: any; key: string | number } | null {
  const segments = path.split(".");
  let cur = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    const bracketMatch = seg.match(/^\$\[(\w+)=(.+)\]$/);
    if (bracketMatch && Array.isArray(cur)) {
      const [, field, val] = bracketMatch;
      const idx = cur.findIndex((item: any) => String(item[field]) === val);
      if (idx === -1) return null;
      cur = cur[idx];
    } else {
      if (cur == null) return null;
      cur = cur[seg];
    }
  }
  const lastSeg = segments[segments.length - 1];
  return { parent: cur, key: lastSeg };
}

/** Apply a single TQL operation to a content object, returning the new content. */
export function applyOperation(content: any, op: TQLOperation): any {
  const c = structuredClone(content ?? {});

  switch (op.type) {
    case "set": {
      if (op.path.includes("$[")) {
        const resolved = resolveArrayFilterPath(c, op.path);
        if (resolved) {
          resolved.parent[resolved.key] = op.value;
        }
        return c;
      }
      return setByPath(c, op.path, op.value);
    }

    case "push": {
      const arr = getByPath(c, op.path);
      if (Array.isArray(arr)) {
        arr.push(op.value);
        return c;
      }
      return setByPath(c, op.path, [op.value]);
    }

    case "pull": {
      const arr = getByPath(c, op.path);
      if (!Array.isArray(arr)) return c;
      const criteria = op.criteria;
      if (typeof criteria === "string") {
        const filtered = arr.filter((item: any) => item !== criteria && item?.id !== criteria);
        return setByPath(c, op.path, filtered);
      }
      if (typeof criteria === "object" && criteria !== null) {
        const filtered = arr.filter((item: any) => {
          return !Object.entries(criteria).every(([k, v]) => item[k] === v);
        });
        return setByPath(c, op.path, filtered);
      }
      return c;
    }

    case "updateOne": {
      const arr = getByPath(c, op.path);
      if (!Array.isArray(arr)) return c;
      const idx = arr.findIndex((item: any) => item.id === op.value?.id);
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], ...op.value };
      }
      return c;
    }

    case "updateNested": {
      const arr = getByPath(c, op.path);
      if (!Array.isArray(arr)) return c;
      const nIdx = arr.findIndex((item: any) => item.id === op.id);
      if (nIdx !== -1 && op.fieldPath) {
        const segments = op.fieldPath.split(".");
        let target = arr[nIdx];
        for (let i = 0; i < segments.length - 1; i++) {
          if (target[segments[i]] == null) target[segments[i]] = {};
          target = target[segments[i]];
        }
        target[segments[segments.length - 1]] = op.value;
      }
      return c;
    }

    case "batch": {
      let result = c;
      if (op.ops && typeof op.ops === "object") {
        for (const [path, value] of Object.entries(op.ops)) {
          result = applyOperation(result, { type: "set", path, value });
        }
      }
      return result;
    }

    case "increment": {
      const current = getByPath(c, op.path) ?? 0;
      return setByPath(c, op.path, current + (op.amount ?? 1));
    }

    case "toggle": {
      const current = getByPath(c, op.path);
      return setByPath(c, op.path, !current);
    }

    case "move": {
      const arr = getByPath(c, op.path);
      if (!Array.isArray(arr)) return c;
      const fromIdx = arr.findIndex((item: any) => item.id === op.id);
      if (fromIdx === -1 || op.position == null) return c;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(op.position, 0, item);
      return c;
    }

    default:
      console.warn(`TQL: unknown operation type "${op.type}"`);
      return c;
  }
}

const TQL = {
  set(path: string, value: any): TQLOperation {
    return { type: "set", path, value };
  },
  push(path: string, value: any): TQLOperation {
    return { type: "push", path, value };
  },
  pull(path: string, criteria: any): TQLOperation {
    return { type: "pull", path, criteria };
  },
  updateOne(path: string, value: any): TQLOperation {
    return { type: "updateOne", path, value };
  },
  updateNested(path: string, id: string, fieldPath: string, value: any): TQLOperation {
    return { type: "updateNested", path, id, fieldPath, value };
  },
  batch(ops: Record<string, any>): TQLOperation {
    return { type: "batch", path: "", ops };
  },
  increment(path: string, amount: number = 1): TQLOperation {
    return { type: "increment", path, amount };
  },
  toggle(path: string): TQLOperation {
    return { type: "toggle", path };
  },
  move(path: string, id: string, position: number): TQLOperation {
    return { type: "move", path, id, position };
  },
};

export default TQL;
