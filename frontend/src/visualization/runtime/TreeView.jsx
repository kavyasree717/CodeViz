import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
} from 'lucide-react';

import {
  layoutTree,
} from '../shared/graphUtils';

import {
  getDisplayValue,
  getPrimitiveNumber,
} from '../shared/runtimeUtils';


/* --------------------------------------------------
   TREE VIEW (ARRAY-BASED)
   Renders a 1D array as a Binary Tree.
   Index i has children at 2i+1 and 2i+2.
-------------------------------------------------- */

const NODE_SIZE = 80;
const CANVAS_PAD = 40;

export default function TreeView({ arrayValue, variables }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);

  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const elements = arrayValue?.elements || [];

  // Find active index (heuristic: i, index, idx)
  const activeIndex = useMemo(() => {
    const candidates = ['i', 'index', 'idx', 'pos'];
    for (const name of candidates) {
      const val = getPrimitiveNumber(variables?.[name]);
      if (val !== null && val >= 0 && val < elements.length) {
        return val;
      }
    }
    return null;
  }, [variables, elements.length]);

  // Build virtual tree structure from array
  const roots = useMemo(() => {
    if (elements.length === 0) return [];

    const nodes = elements.map((val, idx) => ({
      id: idx,
      method: `idx:${idx}`, // Hidden, just for structure
      args: { val },
      children: [],
      entryStep: 0, // Always visible
      exitStep: 0,
      returned: true,
    }));

    // Link children: i -> 2i+1, 2i+2
    for (let i = 0; i < nodes.length; i++) {
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < nodes.length) nodes[i].children.push(nodes[left]);
      if (right < nodes.length) nodes[i].children.push(nodes[right]);
    }

    return [nodes[0]]; // Root is always index 0
  }, [elements]);

  const layout = useMemo(() => layoutTree(roots), [roots]);

  const handlePointerDown = event => {
    if (event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    setAutoCenter(false);
  };

  const handlePointerMove = event => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + event.clientX - dragRef.current.startX,
      y: dragRef.current.panY + event.clientY - dragRef.current.startY,
    });
  };

  const handlePointerUp = () => { dragRef.current = null; setIsDragging(false); };
  const resetView = () => { setZoom(1); setAutoCenter(true); };

  if (elements.length === 0) {
    return (
      <div className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <p className="text-sm text-gray-500">Empty array.</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b dark:border-dark-border border-light-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 h-4 rounded-full border-2 border-viz-accent flex-shrink-0" />
          <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
            Tree View
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setAutoCenter(v => !v)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${autoCenter ? 'bg-viz-accent/15 text-viz-accent' : 'dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
            <Crosshair size={15} />
          </button>
          <button onClick={() => setZoom(v => Math.max(0.2, v - 0.1))} className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><ZoomOut size={16} /></button>
          <span className="text-xs font-mono text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(v => Math.min(3.0, v + 0.1))} className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><ZoomIn size={16} /></button>
          <button onClick={resetView} className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"><Maximize2 size={15} /></button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative h-[420px] overflow-hidden dark:bg-dark-bg/50 bg-gray-50/70 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: `${layout.width + CANVAS_PAD * 2}px`,
            height: `${layout.height + CANVAS_PAD * 2}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 450ms ease',
          }}
        >
          <svg className="absolute left-0 top-0 pointer-events-none" width={layout.width + CANVAS_PAD * 2} height={layout.height + CANVAS_PAD * 2}>
            {roots.map(node => {
              const pos = layout.positions.get(node.id);
              if (!pos) return null;

              return node.children.map(child => {
                const childPos = layout.positions.get(child.id);
                if (!childPos) return null;

                const x1 = pos.x + CANVAS_PAD + NODE_SIZE / 2;
                const y1 = pos.y + CANVAS_PAD + NODE_SIZE / 2;
                const x2 = childPos.x + CANVAS_PAD + NODE_SIZE / 2;
                const y2 = childPos.y + CANVAS_PAD + NODE_SIZE / 2;

                return (
                  <line
                    key={`edge-${node.id}-${child.id}`}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    strokeWidth={2}
                    className="stroke-gray-300 dark:stroke-white/10"
                  />
                );
              });
            })}
          </svg>

          {roots.map(node => {
            const pos = layout.positions.get(node.id);
            if (!pos) return null;

            const isActive = node.id === activeIndex;
            const val = node.args.val;

            const stateClasses = isActive
              ? 'border-viz-accent dark:bg-viz-accent/15 bg-viz-accent/10 shadow-lg shadow-viz-accent/10'
              : 'dark:border-white/15 border-gray-300 dark:bg-[#201A35] bg-white';

            return (
              <div
                key={node.id}
                className={`absolute rounded-full border flex flex-col items-center justify-center px-2 text-center ${stateClasses}`}
                style={{
                  left: `${pos.x + CANVAS_PAD}px`,
                  top: `${pos.y + CANVAS_PAD}px`,
                  width: `${NODE_SIZE}px`,
                  height: `${NODE_SIZE}px`,
                }}
              >
                <span className="font-mono text-[9px] text-gray-400 leading-none mb-1">
                  [{node.id}]
                </span>
                <span className="font-mono text-[12px] font-bold dark:text-gray-100 text-gray-800 leading-tight break-all px-1 max-w-[70px]">
                  {getDisplayValue(val)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] text-gray-500 pointer-events-none">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-viz-accent" /> active</span>
          <span>drag to pan</span>
        </div>
      </div>
    </section>
  );
}