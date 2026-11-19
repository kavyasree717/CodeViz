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
   RECURRENCE GRAPH
   Square call nodes + edges + a token that dives into
   the recursion and climbs back carrying answers.
-------------------------------------------------- */

const NODE_WIDTH = 132;
const NODE_HEIGHT = 64;
const CANVAS_PAD = 40;

function formatArgs(args) {
  const entries = Object.entries(args || {});

  if (entries.length === 0) return '()';

  return '(' +
    entries
      .map(([name, value]) => `${name}=${getDisplayValue(value)}`)
      .join(', ') +
    ')';
}

export default function RecursionGraph({ events = [], currentStep = 0 }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);

  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const roots = useMemo(() => buildCallTree(events), [events]);
  const layout = useMemo(() => layoutTree(roots), [roots]);

  const visibleNodes = useMemo(
    () => flattenTree(roots).filter(node => node.entryStep <= currentStep),
    [roots, currentStep]
  );

  const activeId = getActiveNodeId(roots, currentStep);
  const activePosition = activeId == null
    ? null
    : layout.positions.get(activeId) || null;

  useEffect(() => {
    if (!autoCenter || !activePosition) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setPan({
      x: rect.width / 2 - (activePosition.x + CANVAS_PAD) * zoom,
      y: rect.height / 2 - (activePosition.y + NODE_HEIGHT / 2 + CANVAS_PAD) * zoom,
    });
  }, [activeId, autoCenter, zoom, activePosition]);

  const handlePointerDown = event => {
    if (event.button !== 0) return;

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };

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

  const handlePointerUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setAutoCenter(true);
  };

  if (roots.length === 0) {
    return (
      <div className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <p className="text-sm text-gray-500">
          No method calls recorded yet.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white overflow-hidden">

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b dark:border-dark-border border-light-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-4 h-4 rounded-sm border-2 border-viz-accent flex-shrink-0" />
          <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
            Recursion graph
          </h3>
          <span className="text-[10px] text-gray-500 hidden sm:inline">
            dive down · climb back with answers
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoCenter(value => !value)}
            title={autoCenter ? 'Camera follow: on' : 'Camera follow: off'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              autoCenter
                ? 'bg-viz-accent/15 text-viz-accent'
                : 'dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
          >
            <Crosshair size={15} />
          </button>

          <button
            onClick={() => setZoom(value => Math.max(0.2, value - 0.1))}
            title="Zoom out"
            className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <ZoomOut size={16} />
          </button>

          <span className="text-xs font-mono text-gray-500 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => setZoom(value => Math.min(3.0, value + 0.1))}
            title="Zoom in"
            className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <ZoomIn size={16} />
          </button>

          <button
            onClick={resetView}
            title="Reset view"
            className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative h-[420px] overflow-hidden dark:bg-dark-bg/50 bg-gray-50/70 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
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
          <svg
            className="absolute left-0 top-0 pointer-events-none"
            width={layout.width + CANVAS_PAD * 2}
            height={layout.height + CANVAS_PAD * 2}
          >
            {visibleNodes.map(node => {
              if (node.parentId == null) return null;

              const childPos = layout.positions.get(node.id);
              const parentPos = layout.positions.get(node.parentId);
              if (!childPos || !parentPos) return null;

              const x1 = parentPos.x + CANVAS_PAD;
              const y1 = parentPos.y + NODE_HEIGHT + CANVAS_PAD;
              const x2 = childPos.x + CANVAS_PAD;
              const y2 = childPos.y + CANVAS_PAD;

              const state = getNodeState(node, currentStep, activeId);
              const showValue = node.returned && currentStep >= node.exitStep;

              return (
                <g key={`edge-${node.id}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    strokeWidth={1.5}
                    className={
                      showValue
                        ? 'stroke-green-500'
                        : state === 'active'
                          ? 'stroke-viz-accent'
                          : 'stroke-gray-400 dark:stroke-white/15'
                    }
                  />

                  {showValue && (
                    <text
                      x={(x1 + x2) / 2 + 5}
                      y={(y1 + y2) / 2}
                      className="fill-green-500 text-[10px] font-mono"
                    >
                      {node.returnValue !== undefined
                        ? getDisplayValue(node.returnValue)
                        : 'void'}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* ACTIVE TOKEN - Fixed positioning to perfectly overlap node */}
          {activePosition && (
            <div
              className="absolute rounded-lg border-2 border-viz-accent pointer-events-none"
              style={{
                left: `${activePosition.x + CANVAS_PAD - 6}px`,
                top: `${activePosition.y + CANVAS_PAD - 6}px`,
                width: `${NODE_WIDTH + 12}px`,
                height: `${NODE_HEIGHT + 12}px`,
                boxShadow: '0 0 18px rgba(139, 92, 246, 0.35)',
                transition:
                  'left 450ms cubic-bezier(.2,.8,.2,1), top 450ms cubic-bezier(.2,.8,.2,1)',
              }}
            />
          )}

          {visibleNodes.map(node => {
            const position = layout.positions.get(node.id);
            if (!position) return null;

            const state = getNodeState(node, currentStep, activeId);
            const showValue = node.returned && currentStep >= node.exitStep;

            const stateClasses =
              state === 'active'
                ? 'border-viz-accent dark:bg-viz-accent/15 bg-viz-accent/10 shadow-lg shadow-viz-accent/10'
                : state === 'returned'
                  ? 'border-green-500/60 dark:bg-green-500/10 bg-green-50'
                  : 'dark:border-white/15 border-gray-300 dark:bg-[#201A35] bg-white';

            return (
              <div
                key={node.id}
                className={`absolute rounded-md border flex flex-col items-center justify-center gap-0.5 px-1.5 text-center ${stateClasses}`}
                style={{
                  left: `${position.x + CANVAS_PAD - NODE_WIDTH / 2}px`,
                  top: `${position.y + CANVAS_PAD}px`,
                  width: `${NODE_WIDTH}px`,
                  height: `${NODE_HEIGHT}px`,
                }}
                title={`${node.method}${formatArgs(node.args)}`}
              >
                <span className="font-mono text-[11px] font-bold dark:text-gray-100 text-gray-800 leading-tight truncate max-w-full">
                  {node.method}
                </span>

                <span className="font-mono text-[9px] dark:text-gray-400 text-gray-500 leading-tight truncate max-w-full">
                  {formatArgs(node.args)}
                </span>

                <span
                  className={`font-mono text-[10px] font-semibold leading-tight truncate max-w-full ${
                    showValue
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-transparent'
                  }`}
                >
                  {showValue
                    ? `→ ${node.returnValue !== undefined
                        ? getDisplayValue(node.returnValue)
                        : 'void'}`
                    : '·'}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] text-gray-500 pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border border-viz-accent" />
            call
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border border-green-500" />
            returned
          </span>
          <span>drag to pan · camera follows the token</span>
        </div>
      </div>
    </section>
  );
}