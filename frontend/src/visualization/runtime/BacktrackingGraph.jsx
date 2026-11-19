import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
} from 'lucide-react';

import {
  buildCallTree,
  getActiveNodeId,
  getNodeState,
  flattenTree,
  layoutTree,
} from '../shared/graphUtils';

import {
  getDisplayValue,
} from '../shared/runtimeUtils';


/* --------------------------------------------------
   BACKTRACKING GRAPH
   Circular nodes showing the SUBSET/PATH being built.
-------------------------------------------------- */

const NODE_SIZE = 100;
const CANVAS_PAD = 40;

function extractPath(args) {
  if (!args) return null;
  const pathArg = args.path || args.current || args.subset;
  if (pathArg) {
    if (pathArg.kind === 'string') {
      const val = pathArg.value || '';
      return val.trim() ? `[${val.trim()}]` : '[]';
    }
    if (pathArg.kind === 'array') {
      const elements = pathArg.elements || [];
      return '[' + elements.map(e => getDisplayValue(e)).join(', ') + ']';
    }
  }
  return null;
}

function extractIndex(args) {
  if (!args) return null;
  const indexArg = args.index || args.i;
  if (indexArg && indexArg.kind === 'primitive') {
    return indexArg.value;
  }
  return null;
}

export default function BacktrackingGraph({ events = [], currentStep = 0 }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);

  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const fullTreeRoots = useMemo(() => buildCallTree(events), [events]);

  // Skip 'main' wrapper if it's the only root
  const roots = useMemo(() => {
    if (fullTreeRoots.length === 1 && fullTreeRoots[0].method === 'main') {
      return fullTreeRoots[0].children;
    }
    return fullTreeRoots;
  }, [fullTreeRoots]);

  const layout = useMemo(() => layoutTree(roots), [roots]);

  const visibleNodes = useMemo(
    () => flattenTree(roots).filter(node => node.entryStep <= currentStep),
    [roots, currentStep]
  );

  const activeId = getActiveNodeId(roots, currentStep);
  const activePosition = activeId == null ? null : layout.positions.get(activeId) || null;

  useEffect(() => {
    if (!autoCenter || !activePosition) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPan({
      x: rect.width / 2 - (activePosition.x + CANVAS_PAD) * zoom,
      y: rect.height / 2 - (activePosition.y + NODE_SIZE / 2 + CANVAS_PAD) * zoom,
    });
  }, [activeId, autoCenter, zoom, activePosition]);

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

  if (roots.length === 0) {
    return (
      <div className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <p className="text-sm text-gray-500">No backtracking steps recorded yet.</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b dark:border-dark-border border-light-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 h-4 rounded-full border-2 border-viz-accent flex-shrink-0" />
          <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
            Subset Tree
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
            {visibleNodes.map(node => {
              if (node.parentId == null) return null;
              const childPos = layout.positions.get(node.id);
              const parentPos = layout.positions.get(node.parentId);
              if (!childPos || !parentPos) return null;

              const x1 = parentPos.x + CANVAS_PAD + NODE_SIZE / 2;
              const y1 = parentPos.y + CANVAS_PAD + NODE_SIZE / 2;
              const x2 = childPos.x + CANVAS_PAD + NODE_SIZE / 2;
              const y2 = childPos.y + CANVAS_PAD + NODE_SIZE / 2;

              return (
                <line
                  key={`edge-${node.id}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  strokeWidth={2}
                  className="stroke-gray-300 dark:stroke-white/10"
                />
              );
            })}
          </svg>

          {/* ACTIVE TOKEN - Fixed positioning to perfectly overlap node */}
          {activePosition && (
            <div
              className="absolute rounded-full border-2 border-viz-accent pointer-events-none"
              style={{
                left: `${activePosition.x + CANVAS_PAD - 6}px`,
                top: `${activePosition.y + CANVAS_PAD - 6}px`,
                width: `${NODE_SIZE + 12}px`,
                height: `${NODE_SIZE + 12}px`,
                boxShadow: '0 0 18px rgba(139, 92, 246, 0.35)',
                transition: 'left 450ms cubic-bezier(.2,.8,.2,1), top 450ms cubic-bezier(.2,.8,.2,1)',
              }}
            />
          )}

          {visibleNodes.map(node => {
            const position = layout.positions.get(node.id);
            if (!position) return null;
            const state = getNodeState(node, currentStep, activeId);

            const path = extractPath(node.args);
            const index = extractIndex(node.args);

            const stateClasses =
              state === 'active'
                ? 'border-viz-accent dark:bg-viz-accent/15 bg-viz-accent/10 shadow-lg shadow-viz-accent/10'
                : state === 'returned'
                  ? 'border-green-500/60 dark:bg-green-500/10 bg-green-50'
                  : 'dark:border-white/15 border-gray-300 dark:bg-[#201A35] bg-white';

            return (
              <div
                key={node.id}
                className={`absolute rounded-full border flex flex-col items-center justify-center px-2 text-center ${stateClasses}`}
                style={{
                  left: `${position.x + CANVAS_PAD}px`,
                  top: `${position.y + CANVAS_PAD}px`,
                  width: `${NODE_SIZE}px`,
                  height: `${NODE_SIZE}px`,
                }}
              >
                {index !== null && (
                  <span className="font-mono text-[9px] text-gray-400 leading-none mb-1">
                    i={index}
                  </span>
                )}
                <span className="font-mono text-[11px] font-bold dark:text-gray-100 text-gray-800 leading-tight break-all px-1 max-w-[90px]">
                  {path || '[]'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] text-gray-500 pointer-events-none">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-viz-accent" /> active</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-green-500" /> done</span>
          <span>drag to pan</span>
        </div>
      </div>
    </section>
  );
}