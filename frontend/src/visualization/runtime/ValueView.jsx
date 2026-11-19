
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  getDisplayValue,
  isSimpleValue,
} from '../shared/runtimeUtils';

export default function ValueView({ name, value, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (isSimpleValue(value)) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 border-b dark:border-dark-border border-light-border">
        <span className="font-mono text-xs dark:text-viz-mid text-viz-accent">
          {name}
        </span>

        <span className="font-mono text-sm dark:text-gray-200 text-gray-700 break-all">
          {getDisplayValue(value)}
        </span>
      </div>
    );
  }

  const isArray = value.kind === 'array';
  const isObject = value.kind === 'object';
  const isReference = value.kind === 'reference';

  const children = isArray
    ? value.elements || []
    : isObject
      ? Object.entries(value.fields || {})
      : [];

  const expandable = children.length > 0;

  return (
    <div className="border-b dark:border-dark-border border-light-border py-2">
      <button
        onClick={() => setExpanded(previous => !previous)}
        disabled={!expandable}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs dark:text-viz-mid text-viz-accent font-mono">
            {name}
          </span>

          <span className="text-xs dark:text-gray-500 text-gray-400">
            {isArray
              ? `Array · ${value.length} items`
              : isObject
                ? value.type
                : isReference
                  ? 'Reference'
                  : value.type || value.kind}
          </span>
        </div>

        {expandable && (
          <ChevronDown
            size={14}
            className={`flex-shrink-0 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {expanded && (
        <div className="mt-2 ml-3 pl-3 border-l dark:border-dark-border border-light-border">
          {isArray && (
            <div className="flex flex-wrap gap-2">
              {children.map((item, index) => (
                <div
                  key={index}
                  className="min-w-12 px-3 py-2 rounded-lg dark:bg-dark-bg bg-gray-100 border dark:border-dark-border border-light-border text-center"
                >
                  <div className="text-xs dark:text-gray-500 text-gray-400">
                    [{index}]
                  </div>

                  <div className="text-sm font-mono dark:text-gray-200 text-gray-700">
                    {getDisplayValue(item)}
                  </div>
                </div>
              ))}

              {value.length > children.length && (
                <span className="text-xs text-gray-500 self-center">
                  Remaining elements not displayed
                </span>
              )}
            </div>
          )}

          {isObject &&
            children.map(([field, fieldValue]) => (
              <ValueView
                key={field}
                name={field}
                value={fieldValue}
                depth={depth + 1}
              />
            ))}

          {isReference && (
            <p className="text-xs dark:text-gray-400 text-gray-500">
              Object reference ID: {value.id}
            </p>
          )}

          {!expandable && !isReference && (
            <p className="text-xs text-gray-500">
              No captured fields.
            </p>
          )}

          {value.truncated && (
            <p className="text-xs text-gray-500 mt-2">
              Object expansion limit reached.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
