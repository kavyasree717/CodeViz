import { Activity, CheckCircle2, XCircle } from 'lucide-react';

export default function BranchDecision({ event }) {
  // Only claim TRUE or FALSE when a boolean was actually captured.
  // A missing value must never be displayed as FALSE.
  const rawResult = event?.conditionResult;
  const resultKnown = rawResult === true || rawResult === false;
  const conditionResult = rawResult === true;

  // Prefer the backend's explicit branchTaken. Otherwise derive the path
  // from the captured result — but never guess when nothing was captured.
  const branchTaken =
    event?.branchTaken ||
    (resultKnown
      ? conditionResult
        ? 'THEN'
        : event?.hasElse
          ? 'ELSE'
          : 'SKIP'
      : null);

  const ifSelected = branchTaken === 'THEN';
  const elseSelected = branchTaken === 'ELSE';

  return (
    <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-viz-accent" />
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Runtime branch decision
            </p>
          </div>

          <p className="text-sm dark:text-gray-300 text-gray-600 mt-1">
            Java evaluated this condition during execution.
          </p>
        </div>

        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
            resultKnown
              ? conditionResult
                ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'border-gray-400/40 bg-gray-400/10 text-gray-500 dark:text-gray-400'
          }`}
        >
          {resultKnown ? (
            conditionResult ? <CheckCircle2 size={14} /> : <XCircle size={14} />
          ) : (
            <Activity size={14} />
          )}
          {resultKnown ? (conditionResult ? 'TRUE' : 'FALSE') : 'NOT CAPTURED'}
        </span>
      </div>

      <div className="rounded-lg dark:bg-dark-bg bg-gray-50 border dark:border-dark-border border-light-border p-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">
          {event?.line != null
            ? `Evaluated expression · Line ${event.line}`
            : 'Evaluated expression'}
        </p>

        <code className="text-sm font-mono dark:text-gray-100 text-gray-800 break-all">
          {event?.conditionExpression || 'Condition expression unavailable'}
        </code>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className={`rounded-lg border p-3 ${
            ifSelected
              ? 'border-green-500/50 bg-green-500/10'
              : 'dark:border-dark-border border-light-border dark:bg-dark-bg bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold dark:text-gray-200 text-gray-700">
              IF path
            </span>
            {ifSelected && (
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">
                SELECTED
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {ifSelected
              ? 'The IF block is executed.'
              : branchTaken == null
                ? 'Path selection was not captured for this event.'
                : 'The IF block is not selected.'}
          </p>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            elseSelected
              ? 'border-amber-500/50 bg-amber-500/10'
              : 'dark:border-dark-border border-light-border dark:bg-dark-bg bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold dark:text-gray-200 text-gray-700">
              {event?.hasElse ? 'ELSE path' : 'No ELSE block'}
            </span>

            {elseSelected && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                SELECTED
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {elseSelected
              ? 'The ELSE block is executed.'
              : branchTaken == null
                ? 'Path selection was not captured for this event.'
                : branchTaken === 'SKIP'
                  ? 'The IF block is skipped; execution continues after it.'
                  : event?.hasElse
                    ? 'The ELSE block is not selected.'
                    : 'The condition has no ELSE block.'}
          </p>
        </div>
      </div>
    </section>
  );
}