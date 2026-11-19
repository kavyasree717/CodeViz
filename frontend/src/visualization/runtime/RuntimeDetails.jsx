
import { Braces, Network, Layers } from 'lucide-react';
import ValueView from './ValueView';

export default function RuntimeDetails({ variables = {}, stack = [] }) {
  const objects = Object.entries(variables).filter(
    ([, value]) => value?.kind === 'object'
  );

  return (
    <div className="space-y-4">
      <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Braces size={16} className="dark:text-viz-mid text-viz-accent" />
          <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
            Local Variables
          </h3>
        </div>

        {Object.keys(variables).length > 0 ? (
          Object.entries(variables).map(([name, value]) => (
            <ValueView key={name} name={name} value={value} />
          ))
        ) : (
          <p className="text-sm text-gray-500">
            No local variables are available in this stack frame.
          </p>
        )}
      </section>

      {objects.length > 0 && (
        <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Network size={16} className="dark:text-viz-mid text-viz-accent" />
            <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
              Captured Objects
            </h3>
          </div>

          {objects.map(([name, value]) => (
            <ValueView key={name} name={name} value={value} />
          ))}
        </section>
      )}

      <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={16} className="dark:text-viz-mid text-viz-accent" />
          <h3 className="text-sm font-semibold dark:text-gray-200 text-gray-700">
            Call Stack
          </h3>
        </div>

        {stack.length > 0 ? (
          stack.map((frame, index) => (
            <div
              key={`${frame.method}-${index}`}
              className={`flex items-center justify-between gap-3 p-3 mb-2 last:mb-0 rounded-lg border ${
                index === 0
                  ? 'border-viz-accent/40 bg-viz-accent/10'
                  : 'dark:border-dark-border border-light-border dark:bg-dark-bg bg-gray-50'
              }`}
            >
              <div>
                <p className="text-sm font-mono dark:text-gray-200 text-gray-700">
                  {frame.method}()
                </p>
                <p className="text-xs text-gray-500">{frame.class}</p>
              </div>

              <span className="text-xs font-mono text-gray-500">
                Line {frame.line}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">
            No call stack information available.
          </p>
        )}
      </section>
    </div>
  );
}
