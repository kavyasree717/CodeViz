import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowRight,
  Database,
  Eye,
  Maximize2,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  GitBranch, // Added for Tree icon
} from 'lucide-react';

import {
  getDisplayValue,
  getPrimitiveNumber,
  getChangedIndices,
  getChangedVariables,
  getPointerColor,
} from '../shared/runtimeUtils';

import { getPointersForArray } from './pointerUtils';
import TreeView from '../runtime/TreeView'; // Added import

// ... [Keep all the helper functions: evaluateExpression, getAccessedIndices, ArrayCanvas] ...

/* --------------------------------------------------
   ARRAY VISUALIZATION (MAIN)
-------------------------------------------------- */

export default function ArrayVisualization({
  arrays,
  variables,
  previousVariables,
  code,
  showPointerDetails,
  currentEvent,
}) {
  const [selectedArrayName, setSelectedArrayName] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [arrayViewMode, setArrayViewMode] = useState('array'); // NEW: 'array' or 'tree'

  const selectedEntry =
    arrays.find(([name]) => name === selectedArrayName) || arrays[0];

  const arrayName = selectedEntry?.[0];
  const arrayValue = selectedEntry?.[1];
  const elements = arrayValue?.elements || [];

  // ... [Keep pointers, changedIndices, accessedIndices logic] ...

  return (
    <div className="space-y-4">
      {arrays.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-gray-500">Select array</label>
          <select
            value={arrayName}
            onChange={event => {
              setSelectedArrayName(event.target.value);
              setSelectedIndex(null);
            }}
            className="text-xs rounded-lg border dark:border-dark-border border-light-border dark:bg-dark-elevated dark:text-gray-200 bg-white text-gray-700 px-3 py-2 outline-none"
          >
            {arrays.map(([name]) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {arrayValue && (
        <div className="space-y-4">
          {/* VIEW MODE TOGGLE */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border dark:border-dark-border border-light-border dark:bg-dark-bg/40 bg-gray-50 p-0.5">
              <button
                onClick={() => setArrayViewMode('array')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  arrayViewMode === 'array'
                    ? 'bg-viz-accent text-white shadow-sm'
                    : 'dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <Database size={12} />
                Array
              </button>
              <button
                onClick={() => setArrayViewMode('tree')}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  arrayViewMode === 'tree'
                    ? 'bg-viz-accent text-white shadow-sm'
                    : 'dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
                }`}
              >
                <GitBranch size={12} />
                Tree
              </button>
            </div>
          </div>

          {/* CONDITIONAL RENDER */}
          {arrayViewMode === 'array' ? (
            <ArrayCanvas
              arrayName={arrayName}
              elements={elements}
              totalArrayLength={arrayValue.length}
              pointers={pointers}
              changedIndices={changedIndices}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              accessedIndices={accessedIndices}
            />
          ) : (
            <TreeView arrayValue={arrayValue} variables={variables} />
          )}
        </div>
      )}

      {/* ... [Keep Pointer state, Element inspection, Variable changes sections] ... */}
    </div>
  );
}