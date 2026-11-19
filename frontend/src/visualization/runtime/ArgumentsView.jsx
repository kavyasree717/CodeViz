
import { ArrowDown, ArrowUp } from 'lucide-react';
import ValueView from './ValueView';
import { getDisplayValue } from '../shared/runtimeUtils';

export function ArgumentsView({ argumentsData }) {
  const entries = Object.entries(argumentsData || {});

  return (
    <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowDown size={16} className="text-viz-mid" />
        <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
          Function Arguments
        </h3>
      </div>

      {entries.length > 0 ? (
        entries.map(([name, value]) => (
          <ValueView key={name} name={name} value={value} />
        ))
      ) : (
        <p className="text-sm text-gray-500">
          No arguments captured for this function.
        </p>
      )}
    </section>
  );
}

export function ReturnView({ value, available, method }) {
  return (
    <section className="rounded-xl border border-green-500/30 dark:bg-green-500/5 bg-green-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowUp size={16} className="text-green-500" />
        <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
          Function Return
        </h3>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-sm dark:text-gray-300 text-gray-600">
          {method}()
        </span>

        <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400 break-all">
          {available ? getDisplayValue(value) : 'Return value unavailable'}
        </span>
      </div>
    </section>
  );
}
