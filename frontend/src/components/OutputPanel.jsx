import { Play, Terminal } from 'lucide-react';

export default function OutputPanel({ output, onRun, isRunning }) {
  return (
    <div className="codeviz-panel h-48 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b dark:border-dark-border border-light-border">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="dark:text-viz-accent text-viz-accent" />
          <span className="text-sm font-semibold dark:text-gray-200 text-gray-700">Output</span>
          {output && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium dark:bg-viz-success/20 dark:text-viz-success bg-green-100 text-green-700">
              Done
            </span>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-viz-accent to-viz-mid hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Play size={14} fill="currentColor" />
          {isRunning ? 'Running...' : 'Run'}
        </button>
      </div>

      {/* Output Content */}
      <div className="flex-1 p-4 overflow-auto font-mono text-sm dark:bg-dark-bg/30 bg-gray-50/50">
        {output ? (
          <pre className="dark:text-gray-300 text-gray-700 whitespace-pre-wrap">{output}</pre>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
            Click "Run" to see output...
          </div>
        )}
      </div>
    </div>
  );
}