export function getDisplayValue(value) {
  if (value === null || value === undefined) return 'null';

  if (typeof value !== 'object') return String(value);

  if (value.kind === 'primitive' || value.kind === 'string') {
    return String(value.value);
  }

  if (value.kind === 'null') return 'null';
  if (value.kind === 'reference') return `Reference #${value.id}`;
  if (value.kind === 'array') return `${value.type || 'Array'} [${value.length}]`;
  if (value.kind === 'object') return value.type || 'Object';

  return value.value !== undefined
    ? String(value.value)
    : value.type || value.kind || 'Object';
}

export function isSimpleValue(value) {
  return (
    value === null ||
    value === undefined ||
    typeof value !== 'object' ||
    ['primitive', 'string', 'null', 'unknown'].includes(value.kind)
  );
}

export function getFrameVariables(event) {
  return event?.stack?.[0]?.variables || {};
}

export function getPrimitiveNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (
    value?.kind === 'primitive' &&
    /^(byte|short|int|long)$/i.test(value.type || '') &&
    /^-?\d+$/.test(String(value.value))
  ) {
    return Number(value.value);
  }

  return null;
}

export function getArrayEntries(variables) {
  return Object.entries(variables || {}).filter(
    ([, value]) => value?.kind === 'array'
  );
}

/*
 * Identifies 2D arrays (grids/matrices).
 * A 2D array is an array whose first element is also an array.
 */
export function getGridEntries(variables) {
  return Object.entries(variables || {}).filter(([, value]) => {
    if (value?.kind !== 'array') return false;
    const firstRow = value.elements?.[0];
    return firstRow?.kind === 'array';
  });
}

export function getChangedIndices(previousArray, currentArray) {
  if (!previousArray || !currentArray) return [];

  const previous = previousArray.elements || [];
  const current = currentArray.elements || [];

  return current.reduce((changed, item, index) => {
    if (JSON.stringify(previous[index]) !== JSON.stringify(item)) {
      changed.push(index);
    }

    return changed;
  }, []);
}

export function getChangedVariables(previousVariables, currentVariables) {
  return Object.entries(currentVariables || {})
    .filter(([name, value]) => {
      if (!Object.prototype.hasOwnProperty.call(previousVariables || {}, name)) {
        return false;
      }

      const previousValue = previousVariables[name];

      if (!isSimpleValue(value) || !isSimpleValue(previousValue)) {
        return false;
      }

      return getDisplayValue(previousValue) !== getDisplayValue(value);
    })
    .map(([name, value]) => ({
      name,
      previous: previousVariables[name],
      current: value,
    }));
}

/* --------------------------------------------------
   POINTER COLORS
-------------------------------------------------- */

const CANONICAL_POINTER_COLORS = {
  left: {
    badge: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-500',
    arrow: 'text-cyan-500',
    cell: 'border-cyan-500/70 bg-cyan-500/10',
  },
  mid: {
    badge: 'bg-pink-500/15 border-pink-500/40 text-pink-500',
    arrow: 'text-pink-500',
    cell: 'border-pink-500/70 bg-pink-500/10',
  },
  right: {
    badge: 'bg-orange-500/15 border-orange-500/40 text-orange-500',
    arrow: 'text-orange-500',
    cell: 'border-orange-500/70 bg-orange-500/10',
  },
};

const GENERAL_POINTER_PALETTE = [
  {
    badge: 'bg-violet-500/15 border-violet-500/40 text-violet-500',
    arrow: 'text-violet-500',
    cell: 'border-violet-500/70 bg-violet-500/10',
  },
  {
    badge: 'bg-blue-500/15 border-blue-500/40 text-blue-500',
    arrow: 'text-blue-500',
    cell: 'border-blue-500/70 bg-blue-500/10',
  },
  {
    badge: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500',
    arrow: 'text-emerald-500',
    cell: 'border-emerald-500/70 bg-emerald-500/10',
  },
  {
    badge: 'bg-rose-500/15 border-rose-500/40 text-rose-500',
    arrow: 'text-rose-500',
    cell: 'border-rose-500/70 bg-rose-500/10',
  },
  {
    badge: 'bg-amber-500/15 border-amber-500/40 text-amber-500',
    arrow: 'text-amber-500',
    cell: 'border-amber-500/70 bg-amber-500/10',
  },
];

function hashPointerName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getPointerColor(name) {
  const safeName = name || '';

  if (/left|low|start/i.test(safeName)) {
    return CANONICAL_POINTER_COLORS.left;
  }

  if (/mid|middle/i.test(safeName)) {
    return CANONICAL_POINTER_COLORS.mid;
  }

  if (/right|high|end/i.test(safeName)) {
    return CANONICAL_POINTER_COLORS.right;
  }

  const index = hashPointerName(safeName) % GENERAL_POINTER_PALETTE.length;
  return GENERAL_POINTER_PALETTE[index];
}