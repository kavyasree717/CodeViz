import { useMemo, useRef, useState } from 'react';
import {
  Database,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

import {
  getDisplayValue,
  getPrimitiveNumber,
} from '../shared/runtimeUtils';


/* --------------------------------------------------
   GRID VISUALIZATION
   Renders 2D arrays (int[][]) for DP tables and
   matrix traversals.
-------------------------------------------------- */

const CELL_SIZE = 60;
const HEADER_SIZE = 30;
const GAP = 4;

/*
 * Evaluates simple math expressions (like "i-1" or "j+2")
 * using the current runtime variables.
 */
function evaluateExpression(expr, variables) {
  try {
    let safeExpr = expr.trim();
    // Replace variable names with their actual numeric values
    for (const [name, val] of Object.entries(variables || {})) {
      const num = getPrimitiveNumber(val);
      if (num !== null) {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        safeExpr = safeExpr.replace(regex, num);
      }
    }
    // Only allow numbers and basic math operators for safety
    if (/^[\d\s\+\-\*\/\(\)\.]+$/.test(safeExpr)) {
      return Math.floor(new Function(`return ${safeExpr}`)());
    }
  } catch (e) {
    // Ignore evaluation errors
  }
  return null;
}

/*
 * Finds all cells accessed on the current line of code.
 */
function getAccessedCells(lineText, gridName, variables) {
  if (!lineText || !gridName) return [];

  const accessed = [];
  // Regex to find gridName[expr1][expr2]
  const regex = new RegExp(`\\b${gridName}\\s*\\[\\s*([^\\]]+)\\s*\\]\\s*\\[\\s*([^\\]]+)\\s*\\]`, 'g');
  
  let match;
  while ((match = regex.exec(lineText)) !== null) {
    const rExpr = match[1];
    const cExpr = match[2];
    
    const r = evaluateExpression(rExpr, variables);
    const c = evaluateExpression(cExpr, variables);
    
    if (r !== null && c !== null) {
      accessed.push({ r, c });
    }
  }
  return accessed;
}

export default function GridVisualization({
  gridName,
  gridValue,
  previousGridValue,
  variables,
  previousVariables,
  currentEvent, // NEW
  code,         // NEW
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const rows = gridValue?.elements || [];
  const cols = rows[0]?.elements || [];
  const numRows = rows.length;
  const numCols = cols.length;

  // Find active cell coordinates (heuristic: i, j, r, c, etc.)
  const activeCoords = useMemo(() => {
    const candidates = ['i', 'j', 'r', 'c', 'row', 'col', 'x', 'y'];
    let rowVar = null;
    let colVar = null;

    for (const name of candidates) {
      const val = getPrimitiveNumber(variables?.[name]);
      if (val !== null) {
        if (!rowVar) rowVar = { name, val };
        else if (!colVar) {
          colVar = { name, val };
          break;
        }
      }
    }

    if (rowVar && colVar) {
      if (rowVar.val >= 0 && rowVar.val < numRows &&
          colVar.val >= 0 && colVar.val < numCols) {
        return { row: rowVar.val, col: colVar.val, rowName: rowVar.name, colName: colVar.name };
      }
    }
    return null;
  }, [variables, numRows, numCols]);

  // Find changed cells (for "NEW" badge)
  const changedCells = useMemo(() => {
    const changed = new Set();
    if (!previousGridValue || !previousGridValue.elements) return changed;

    const prevRows = previousGridValue.elements;
    for (let r = 0; r < numRows; r++) {
      const currRow = rows[r]?.elements || [];
      const prevRow = prevRows[r]?.elements || [];
      for (let c = 0; c < numCols; c++) {
        const currVal = currRow[c]?.value;
        const prevVal = prevRow[c]?.value;
        if (currVal !== prevVal) {
          changed.add(`${r},${c}`);
        }
      }
    }
    return changed;
  }, [gridValue, previousGridValue, numRows, numCols]);

  // NEW: Find accessed cells on the current line
  const accessedCells = useMemo(() => {
    const lineText = code?.split('\n')[currentEvent?.line - 1] || '';
    return getAccessedCells(lineText, gridName, variables);
  }, [code, currentEvent?.line, gridName, variables]);

  const canvasWidth = HEADER_SIZE + numCols * (CELL_SIZE + GAP) + 20;
  const canvasHeight = HEADER_SIZE + numRows * (CELL_SIZE + GAP) + 20;

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
    setPan({ x: 20, y: 20 });
  };

  if (numRows === 0 || numCols === 0) {
    return (
      <div className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <p className="text-sm text-gray-500">Empty grid.</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b dark:border-dark-border border-light-border">
        <div className="flex items-center gap-2 min-w-0">
          <Database size={16} className="text-viz-accent" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
              {gridName}
            </h3>
            <p className="text-xs text-gray-500">
              {numRows} × {numCols} · 2D Array
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
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

      {/* CANVAS */}
      <div
        ref={containerRef}
        className={`relative h-[400px] overflow-hidden dark:bg-dark-bg/50 bg-gray-50/70 select-none ${
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
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 300ms ease',
          }}
        >
          {/* ROW HEADERS */}
          {rows.map((_, r) => (
            <div
              key={`row-header-${r}`}
              className="absolute flex items-center justify-center text-[10px] font-mono text-gray-500"
              style={{
                left: 0,
                top: HEADER_SIZE + r * (CELL_SIZE + GAP),
                width: HEADER_SIZE,
                height: CELL_SIZE,
              }}
            >
              {r}
            </div>
          ))}

          {/* COL HEADERS */}
          {cols.map((_, c) => (
            <div
              key={`col-header-${c}`}
              className="absolute flex items-center justify-center text-[10px] font-mono text-gray-500"
              style={{
                left: HEADER_SIZE + c * (CELL_SIZE + GAP),
                top: 0,
                width: CELL_SIZE,
                height: HEADER_SIZE,
              }}
            >
              {c}
            </div>
          ))}

          {/* CELLS */}
          {rows.map((rowObj, r) =>
            rowObj.elements.map((cellObj, c) => {
              const isActive =
                activeCoords &&
                activeCoords.row === r &&
                activeCoords.col === c;
              const isChanged = changedCells.has(`${r},${c}`);
              
              // NEW: Check if this cell is being read on the current line
              const isAccessed = accessedCells.some(cell => cell.r === r && cell.c === c);

              let borderClass = 'dark:border-white/15 border-gray-300';
              let bgClass = 'dark:bg-[#201A35] bg-white';

              if (isActive) {
                borderClass = 'border-viz-accent border-2';
                bgClass = 'dark:bg-viz-accent/15 bg-viz-accent/10';
              } else if (isAccessed) {
                // NEW: Blue style for source/read cells
                borderClass = 'border-blue-500 border-2';
                bgClass = 'dark:bg-blue-500/15 bg-blue-50';
              } else if (isChanged) {
                borderClass = 'border-green-500';
                bgClass = 'dark:bg-green-500/10 bg-green-50';
              }

              return (
                <div
                  key={`cell-${r}-${c}`}
                  className={`absolute rounded-md border flex flex-col items-center justify-center gap-0.5 ${borderClass} ${bgClass}`}
                  style={{
                    left: HEADER_SIZE + c * (CELL_SIZE + GAP),
                    top: HEADER_SIZE + r * (CELL_SIZE + GAP),
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                >
                  <span className="font-mono text-[11px] font-semibold dark:text-gray-100 text-gray-800 leading-tight truncate max-w-full px-1">
                    {getDisplayValue(cellObj)}
                  </span>
                  {isChanged && (
                    <span className="text-[8px] text-green-600 dark:text-green-400 font-bold">
                      NEW
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* LEGEND */}
        <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[10px] text-gray-500 pointer-events-none">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border border-viz-accent" />
            active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border border-blue-500" />
            accessed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm border border-green-500" />
            changed
          </span>
          <span>drag to pan</span>
        </div>
      </div>
    </section>
  );
}