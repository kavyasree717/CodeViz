import { useState } from 'react';

import {
  Layers,
  GitBranch,
  AlertTriangle,
  ArrowRight,
  List,
  Network,
} from 'lucide-react';

import {
  getDisplayValue,
} from '../shared/runtimeUtils';

import {
  buildCallTree,
  getActiveNodeId,
  flattenTree,
} from '../shared/graphUtils';

import RecursionGraph from './RecursionGraph';
import BacktrackingGraph from './BacktrackingGraph';


/* --------------------------------------------------
   HELPERS
-------------------------------------------------- */

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


/* --------------------------------------------------
   BACKTRACKING TREE NODE (List mode)
-------------------------------------------------- */

function BacktrackingTreeNode({ node, activeId, currentStep }) {
  const isActive = node.id === activeId;
  const indent = Math.min(node.depth, 10) * 14;

  const path = extractPath(node.args);
  const index = extractIndex(node.args);

  // main has no path → show its name; backtracking calls show the subset
  const label = path !== null ? path : node.method;

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono ${
          isActive
            ? 'border-viz-accent bg-viz-accent/10 dark:text-gray-100 text-gray-800'
            : 'dark:border-dark-border border-light-border dark:bg-dark-bg/40 bg-gray-50 dark:text-gray-300 text-gray-600'
        }`}
        style={{ marginLeft: `${indent}px` }}
      >
        <span className="font-bold dark:text-viz-accent text-viz-mid">
          {label}
        </span>
        {index !== null && (
          <span className="dark:text-gray-400 text-gray-500 text-[10px]">
            i={index}
          </span>
        )}
      </div>

      {node.children
        .filter(child => child.entryStep <= currentStep)
        .map(child => (
          <BacktrackingTreeNode key={child.id} node={child} activeId={activeId} currentStep={currentStep} />
        ))}
    </div>
  );
}


/* --------------------------------------------------
   RECURSION TREE NODE (List mode)
-------------------------------------------------- */

function TreeNode({ node, activeId, currentStep }) {
  const isActive = node.id === activeId;
  const indent = Math.min(node.depth, 10) * 14;

  const hasReturnedByStep =
    node.returned &&
    node.exitStep !== null &&
    node.exitStep <= currentStep;

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-mono ${
          isActive
            ? 'border-viz-accent bg-viz-accent/10 dark:text-gray-100 text-gray-800'
            : hasReturnedByStep
              ? 'dark:border-dark-border border-light-border dark:bg-dark-bg/40 bg-gray-50 dark:text-gray-400 text-gray-500'
              : 'dark:border-dark-border border-light-border dark:bg-dark-bg/40 bg-gray-50 dark:text-gray-300 text-gray-600'
        }`}
        style={{ marginLeft: `${indent}px` }}
      >
        <span className="font-semibold dark:text-viz-accent text-viz-mid">
          {node.method}
        </span>
        <span className="dark:text-gray-400 text-gray-500">
          ({Object.entries(node.args || {}).map(([k, v]) => `${k}=${getDisplayValue(v)}`).join(', ')})
        </span>

        {hasReturnedByStep && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <ArrowRight size={12} />
            {node.returnValue !== undefined
              ? getDisplayValue(node.returnValue)
              : 'void'}
          </span>
        )}

        {isActive && (
          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-viz-accent">
            active
          </span>
        )}
      </div>

      {node.children
        .filter(child => child.entryStep <= currentStep)
        .map(child => (
          <TreeNode key={child.id} node={child} activeId={activeId} currentStep={currentStep} />
        ))}
    </div>
  );
}


/* --------------------------------------------------
   CALL STACK VIEW
-------------------------------------------------- */

export default function CallStackView({ currentEvent, events = [], currentStep = 0 }) {
  const [viewMode, setViewMode] = useState('list');

  const stack = currentEvent?.stack || [];
  const depth = currentEvent?.stackDepth ?? stack.length;

  const roots = buildCallTree(events);
  const activeId = getActiveNodeId(roots, currentStep);

  // FIX: scan EVERY node (not just roots) for a path-like argument.
  const isBacktracking = flattenTree(roots).some(
    node => extractPath(node.args) !== null
  );

  return (
    <div className="space-y-4">

      <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-viz-accent" />
            <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
              Call Stack
            </h3>
          </div>
          <span className="text-xs font-mono text-gray-500">
            depth {depth}
          </span>
        </div>

        {stack.length === 0 ? (
          <p className="text-sm text-gray-500">
            No stack frames captured for this step.
          </p>
        ) : (
          <div className="space-y-1.5">
            {stack.map((frame, index) => (
              <div
                key={`${frame.method}-${frame.class}-${index}`}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-xs font-mono ${
                  index === 0
                    ? 'border-viz-accent bg-viz-accent/10 dark:text-gray-100 text-gray-800'
                    : 'dark:border-dark-border border-light-border dark:bg-dark-bg/40 bg-gray-50 dark:text-gray-400 text-gray-500'
                }`}
              >
                <span className="font-semibold">
                  {frame.method}
                  <span className="dark:text-gray-500 text-gray-400 font-normal">
                    {' '}({frame.class})
                  </span>
                </span>

                <span className="flex items-center gap-2">
                  <span className="dark:text-gray-500 text-gray-400">
                    line {frame.line ?? '—'}
                  </span>
                  {index === 0 && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-viz-accent">
                      active
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-viz-accent" />
            <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
              {isBacktracking ? 'Subset Tree' : 'Call Tree'}
            </h3>
          </div>

          <div className="flex items-center gap-1 rounded-lg border dark:border-dark-border border-light-border dark:bg-dark-bg/40 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="List view"
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                viewMode === 'list'
                  ? 'bg-viz-accent text-white shadow-sm'
                  : 'dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <List size={12} />
              List
            </button>

            <button
              type="button"
              onClick={() => setViewMode('graph')}
              title="Graph view"
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                viewMode === 'graph'
                  ? 'bg-viz-accent text-white shadow-sm'
                  : 'dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
            >
              <Network size={12} />
              Graph
            </button>
          </div>
        </div>

        {roots.length === 0 ? (
          <p className="text-sm text-gray-500">
            No method calls recorded yet.
          </p>
        ) : viewMode === 'list' ? (
          <div className="space-y-1 overflow-auto max-h-72">
            {roots
              .filter(root => root.entryStep <= currentStep)
              .map(root => (
                isBacktracking
                  ? <BacktrackingTreeNode key={root.id} node={root} activeId={activeId} currentStep={currentStep} />
                  : <TreeNode key={root.id} node={root} activeId={activeId} currentStep={currentStep} />
              ))}
          </div>
        ) : (
          isBacktracking
            ? <BacktrackingGraph events={events} currentStep={currentStep} />
            : <RecursionGraph events={events} currentStep={currentStep} />
        )}
      </section>

    </div>
  );
}


/* --------------------------------------------------
   EXECUTION STOPPED BANNER
-------------------------------------------------- */

export function ExecutionStoppedBanner({ event }) {
  if (!event || event.eventType !== 'EXECUTION_STOPPED') return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
      <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
          Execution stopped
        </h4>
        <p className="text-xs leading-relaxed dark:text-gray-300 text-gray-600 mt-1">
          {event.reason ||
            'The program was stopped because it did not finish safely.'}
        </p>
      </div>
    </div>
  );
}