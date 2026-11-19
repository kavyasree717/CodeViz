/* --------------------------------------------------
   GRAPH UTILITIES
   Shared brain for the node/edge visualizations:
   recursion calls, backtracking decisions, trees and
   graphs all reuse these builders and layouts.
-------------------------------------------------- */

export const GRAPH_COLUMN_WIDTH = 150;
export const GRAPH_LEVEL_HEIGHT = 110;

/*
 * Replays METHOD_ENTRY / METHOD_EXIT events once and builds the full
 * call tree. Every node records the step it was entered and the step
 * it returned, so its state at ANY step can be derived by simple
 * comparison. This keeps the visualization scrubbable and honest.
 */
export function buildCallTree(events = []) {
  const roots = [];
  const open = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;

    if (ev.eventType === 'METHOD_ENTRY') {
      const node = {
        id: i,
        entryStep: i,
        exitStep: null,
        method: ev.method || '?',
        cls: ev.class || '',
        args: ev.arguments || {},
        depth: open.length,
        parentId: open.length > 0 ? open[open.length - 1].id : null,
        children: [],
        returned: false,
        returnValue: undefined,
      };

      if (open.length === 0) {
        roots.push(node);
      } else {
        open[open.length - 1].children.push(node);
      }

      open.push(node);
    } else if (ev.eventType === 'METHOD_EXIT') {
      const node = open.pop();

      if (node) {
        node.exitStep = i;
        node.returned = true;
        node.returnValue = ev.returnValueAvailable
          ? ev.returnValue
          : undefined;
      }
    }
  }

  return roots;
}

/*
 * The token position: the deepest call that is still open at `step`
 * (entered, and not yet fully returned). At a METHOD_EXIT step this
 * is exactly the frame that is returning.
 */
export function getActiveNodeId(roots, step) {
  let best = null;

  const visit = node => {
    const isOpenAtStep =
      node.entryStep <= step &&
      (node.exitStep === null || node.exitStep >= step);

    if (isOpenAtStep && (!best || node.depth > best.depth)) {
      best = node;
    }

    node.children.forEach(visit);
  };

  roots.forEach(visit);

  return best ? best.id : null;
}

/*
 * pending  -> not called yet at this step (not drawn)
 * active   -> the token is here right now
 * open     -> called, waiting for a child to answer
 * returned -> finished; carries its value
 */
export function getNodeState(node, step, activeId) {
  if (step < node.entryStep) return 'pending';
  if (node.id === activeId) return 'active';
  if (node.exitStep !== null && step >= node.exitStep) return 'returned';
  return 'open';
}

/*
 * Flat list of every node (depth-first). Handy for rendering.
 */
export function flattenTree(roots) {
  const list = [];

  const visit = node => {
    list.push(node);
    node.children.forEach(visit);
  };

  roots.forEach(visit);

  return list;
}

/*
 * Tidy tree layout.
 *
 * Leaves take consecutive column slots; every parent centers itself
 * above its children. Depth becomes the vertical position.
 *
 * The layout is computed for the WHOLE tree once, so node positions
 * are stable while stepping: newly revealed nodes appear at their
 * pre-ordained seats instead of pushing siblings around.
 */
export function layoutTree(roots) {
  let nextColumn = 0;
  const positions = new Map();

  const visit = node => {
    if (node.children.length === 0) {
      const x = nextColumn * GRAPH_COLUMN_WIDTH;
      nextColumn += 1;
      positions.set(node.id, { x, y: node.depth * GRAPH_LEVEL_HEIGHT });
      return x;
    }

    const childXs = node.children.map(visit);
    const minX = Math.min(...childXs);
    const maxX = Math.max(...childXs);
    const x = (minX + maxX) / 2;

    positions.set(node.id, { x, y: node.depth * GRAPH_LEVEL_HEIGHT });
    return x;
  };

  roots.forEach(visit);

  let width = 0;
  let height = 0;

  positions.forEach(position => {
    width = Math.max(width, position.x);
    height = Math.max(height, position.y);
  });

  return {
    positions,
    width: width + GRAPH_COLUMN_WIDTH,
    height: height + GRAPH_LEVEL_HEIGHT,
  };
}