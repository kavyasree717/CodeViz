import React from 'react';
import { Database, Cpu, Sparkles, ArrowRight } from 'lucide-react';

import {
  getDisplayValue,
  isSimpleValue,
} from './runtimeUtils';

// Compare two variable values by their displayed form.
// Object-shaped values (arrays/objects) are compared by JSON so that
// element changes are detected without flagging every step as changed.
function valuesEqual(a, b) {
  if (isSimpleValue(a) && isSimpleValue(b)) {
    return getDisplayValue(a) === getDisplayValue(b);
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

// Human-friendly type label, e.g. "int", "String", "int[]".
function getTypeLabel(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return typeof value;
  return value.type || value.kind || 'object';
}

export default function VariableInspector({ variables = {}, previousVariables = {} }) {
  const variableEntries = Object.entries(variables);

  return (
    <div className="rounded-2xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-5 shadow-sm space-y-4">

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-viz-accent/10 flex items-center justify-center text-viz-accent">
          <Cpu size={14} />
        </div>
        <h4 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
          Local Variables Inspector
        </h4>
      </div>

      {variableEntries.length === 0 ? (
        <div className="text-center py-6">
          <Database size={24} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm dark:text-gray-300 text-gray-600 font-medium">
            No local variables in current scope
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {variableEntries.map(([name, value]) => {
            const isNew = !Object.prototype.hasOwnProperty.call(
              previousVariables,
              name
            );

            const hasChanged =
              !isNew && !valuesEqual(previousVariables[name], value);

            const state = isNew ? 'new' : hasChanged ? 'changed' : 'same';

            const borderClass =
              state === 'new'
                ? 'border-emerald-500/60 dark:bg-emerald-500/10 bg-emerald-50/50'
                : state === 'changed'
                  ? 'border-amber-500/60 dark:bg-amber-500/10 bg-amber-50/50'
                  : 'dark:border-dark-border border-light-border';

            return (
              <div
                key={name}
                className={`rounded-xl border p-3 transition-all duration-300 dark:bg-dark-bg/40 bg-gray-50 ${borderClass}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold dark:text-viz-accent text-viz-mid">
                    {name}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                    {getTypeLabel(value)}
                  </span>
                </div>

                <div className="font-mono text-base font-semibold dark:text-gray-100 text-gray-800">
                  {getDisplayValue(value)}
                </div>

                {/* What happened to this variable on the current step */}
                {state === 'new' && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Sparkles size={11} />
                    Declared here
                  </div>
                )}

                {state === 'changed' && (
                  <div className="flex items-center gap-1 mt-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <ArrowRight size={11} />
                    <span className="line-through opacity-60">
                      {getDisplayValue(previousVariables[name])}
                    </span>
                    <span>→</span>
                    <span>{getDisplayValue(value)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}