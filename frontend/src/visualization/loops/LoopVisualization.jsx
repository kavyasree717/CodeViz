import React, { useMemo, useState } from 'react';

import {
  Activity,
  Repeat,
  CheckCircle2,
  XCircle,
  Infinity as InfinityIcon,
  RotateCw,
  GitBranch,
  Play,
  Flag,
  ChevronDown,
} from 'lucide-react';

export default function LoopVisualization({
  event,
  events = [],
  currentStep,
  onSelectStep,
}) {
  const [showHistory, setShowHistory] = useState(true);

  // Hooks must run unconditionally (before any early return).
  const loopHistory = useMemo(() => {
    return events
      .map((item, index) => ({
        ...item,
        originalStep: index,
      }))
      .filter(item =>
        item.eventType === 'LOOP_CONDITION' &&
        item.loopId === event?.loopId
      );
  }, [events, event?.loopId]);

  if (!event) return null;

  // Only claim TRUE or FALSE when a boolean was actually captured.
  const rawResult = event.conditionResult;
  const resultKnown = rawResult === true || rawResult === false;
  const conditionIsTrue = rawResult === true;

  const isInfiniteFor =
    event.loopType === 'FOR' &&
    event.conditionExpression === 'for(;;)';

  const loopLabels = {
    WHILE: 'While Loop',
    FOR: 'For Loop',
    DO_WHILE: 'Do-While Loop',
  };

  const loopName = loopLabels[event.loopType] || 'Loop';

  const iteration = Number(event.iteration ?? 0);
  const evaluation = Number(event.evaluation ?? 0);

  // null means "outcome not captured" — never guess.
  const loopContinues = isInfiniteFor
    ? true
    : event.loopAction
      ? event.loopAction === 'CONTINUE'
      : resultKnown
        ? conditionIsTrue
        : null;

  const isLoopFinished =
    !isInfiniteFor && resultKnown && !conditionIsTrue;

  const currentStage = isLoopFinished
    ? 'exit'
    : isInfiniteFor
      ? 'body'
      : event.loopType === 'DO_WHILE' || !resultKnown
        ? 'condition'
        : 'body';

  const conditionText = isInfiniteFor
    ? 'NO CONDITION'
    : resultKnown
      ? conditionIsTrue ? 'TRUE' : 'FALSE'
      : 'NOT CAPTURED';

  const explanation = isInfiniteFor
    ? 'This for loop has no condition expression. Its body continues until execution leaves the loop through a control-flow statement.'
    : !resultKnown
      ? 'The condition result was not captured for this event.'
      : event.loopType === 'DO_WHILE'
        ? conditionIsTrue
          ? 'The body has executed and the condition is true. Execution can return to the body.'
          : 'The body has executed and the condition is false. Execution leaves the loop.'
        : conditionIsTrue
          ? 'The condition evaluated to true. Execution proceeds into the loop body.'
          : 'The condition evaluated to false. Execution leaves the loop.';

  const visibleHistory = loopHistory.length > 0
    ? loopHistory
    : [{
        ...event,
        originalStep: currentStep ?? 0,
      }];

  const selectedHistoryItem = visibleHistory.find(
    item => item.originalStep === currentStep
  );

  const markerPosition = currentStage === 'exit'
    ? '88%'
    : currentStage === 'condition'
      ? '52%'
      : '25%';

  const handleHistoryClick = item => {
    if (typeof onSelectStep === 'function') {
      onSelectStep(item.originalStep);
    }
  };

  const statusClasses = loopContinues === true
    ? 'bg-teal-500/10 text-teal-600 dark:text-teal-300'
    : loopContinues === false
      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
      : 'bg-gray-400/10 text-gray-500 dark:text-gray-400';

  const explanationBox = loopContinues === true
    ? 'border-teal-500/20 bg-teal-500/5'
    : loopContinues === false
      ? 'border-amber-500/20 bg-amber-500/5'
      : 'border-gray-400/20 bg-gray-400/5';

  const explanationIcon = loopContinues === true
    ? 'bg-teal-500/10 text-teal-500'
    : loopContinues === false
      ? 'bg-amber-500/10 text-amber-500'
      : 'bg-gray-400/10 text-gray-500';

  const middleIsCondition =
    event.loopType === 'DO_WHILE' || currentStage === 'condition';

  return (
    <section className="relative overflow-hidden rounded-2xl border dark:border-dark-border border-light-border dark:bg-[#151126] bg-white">

      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-20 w-64 h-64 rounded-full bg-viz-accent/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-64 h-64 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      <div className="relative p-4 sm:p-5 space-y-5">

        {/* HEADER */}
        <div className="flex items-center justify-between gap-3 flex-wrap">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-viz-accent/10 text-viz-accent">
              {isInfiniteFor
                ? <InfinityIcon size={21} />
                : <Repeat size={21} />}
            </div>

            <div>
              <h3 className="font-semibold text-sm dark:text-gray-100 text-gray-800">
                {isInfiniteFor
                  ? 'Unconditional For Loop'
                  : loopName}
              </h3>

              <p className="text-xs dark:text-gray-500 text-gray-500 mt-0.5">
                Interactive execution explorer
              </p>
            </div>

          </div>

          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses}`}>
            {loopContinues === true
              ? <CheckCircle2 size={14} />
              : loopContinues === false
                ? <XCircle size={14} />
                : <Activity size={14} />}

            {conditionText}
          </div>

        </div>

        {/* CONDITION */}
        <div className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-[#201A35] bg-gray-50 p-4">

          <div className="flex items-center justify-between gap-2 mb-3">

            <span className="text-[10px] uppercase tracking-[0.16em] font-semibold dark:text-gray-400 text-gray-500">
              {isInfiniteFor
                ? 'Loop structure'
                : 'Current condition'}
            </span>

            <span className="text-xs dark:text-gray-500 text-gray-400 font-mono">
              Line {event.line ?? '—'}
            </span>

          </div>

          <div className="flex items-center justify-between gap-3">

            <code className="text-base sm:text-lg font-semibold font-mono dark:text-white text-gray-800 break-all">
              {isInfiniteFor
                ? 'for(;;)'
                : event.conditionExpression || 'Condition unavailable'}
            </code>

            {!isInfiniteFor && (
              <div className={`flex-shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${
                !resultKnown
                  ? 'bg-gray-400/15 text-gray-500'
                  : conditionIsTrue
                    ? 'bg-teal-500/15 text-teal-500'
                    : 'bg-amber-500/15 text-amber-500'
              }`}>
                {conditionText}
              </div>
            )}

          </div>

          {isInfiniteFor && (
            <p className="text-xs dark:text-gray-400 text-gray-500 mt-2">
              This loop has no condition expression at its header.
            </p>
          )}

        </div>

        {/* EXECUTION FLOW */}
        <div className="space-y-3">

          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold dark:text-gray-200 text-gray-700">
              Execution flow
            </h4>

            <span className="text-[10px] dark:text-gray-500 text-gray-400">
              Current execution stage
            </span>
          </div>

          <div className="relative rounded-xl dark:bg-[#1C1730] bg-gray-50 border dark:border-white/5 border-gray-200 p-3 sm:p-4">

            <div className="grid grid-cols-3 gap-2 sm:gap-3 items-center">

              {/* ENTRY */}
              <div className="flex flex-col items-center gap-2">

                <div className="w-full min-h-[76px] rounded-xl border dark:border-white/10 border-gray-200 dark:bg-white/[0.02] bg-white flex flex-col items-center justify-center gap-2">

                  <Play size={17} className="text-gray-400" />

                  <span className="text-xs font-semibold dark:text-gray-200 text-gray-700">
                    Entry
                  </span>

                </div>

                <span className="text-[10px] dark:text-gray-500 text-gray-400">
                  Start
                </span>

              </div>

              {/* BODY / CONDITION */}
              <div className="flex flex-col items-center gap-2">

                <div className={`w-full min-h-[76px] rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-500 ${
                  currentStage === 'condition'
                    ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10'
                    : currentStage === 'body'
                      ? 'border-teal-400 bg-teal-400/10 shadow-lg shadow-teal-400/10'
                      : 'dark:border-white/10 border-gray-200 dark:bg-white/[0.02] bg-white'
                }`}>

                  {middleIsCondition
                    ? <GitBranch size={18} className="text-amber-400" />
                    : <Activity size={18} className="text-teal-400" />}

                  <span className="text-xs font-semibold dark:text-gray-200 text-gray-700">
                    {middleIsCondition
                      ? 'Condition'
                      : 'Loop body'}
                  </span>

                </div>

                <span className="text-[10px] dark:text-gray-500 text-gray-400">
                  {event.loopType === 'DO_WHILE'
                    ? 'Check after body'
                    : 'Execute'}
                </span>

              </div>

              {/* EXIT */}
              <div className="flex flex-col items-center gap-2">

                <div className={`w-full min-h-[76px] rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-500 ${
                  currentStage === 'exit'
                    ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10'
                    : 'dark:border-white/10 border-gray-200 dark:bg-white/[0.02] bg-white'
                }`}>

                  <Flag
                    size={18}
                    className={currentStage === 'exit'
                      ? 'text-amber-400'
                      : 'text-gray-400'}
                  />

                  <span className="text-xs font-semibold dark:text-gray-200 text-gray-700">
                    Exit
                  </span>

                </div>

                <span className="text-[10px] dark:text-gray-500 text-gray-400">
                  Finish
                </span>

              </div>

            </div>

            {/* EXECUTION POSITION TRACK */}
            <div className="relative h-[82px] mt-4 overflow-hidden rounded-lg dark:bg-[#171329] bg-white/70 border dark:border-white/5 border-gray-100">

              <div className="absolute inset-x-5 top-1/2 border-t border-dashed dark:border-white/15 border-gray-300" />

              <div
                className="absolute top-1/2 z-10"
                style={{
                  left: markerPosition,
                  transform: 'translate(-50%, -50%)',
                  transition: 'left 650ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
                    <Activity size={19} />
                  </div>
                  <span className="text-[9px] font-semibold text-teal-600 dark:text-teal-300">
                    Step
                  </span>
                </div>
              </div>

              <div className="absolute bottom-2 left-3 text-[10px] dark:text-gray-500 text-gray-400">
                Current execution position
              </div>

            </div>

          </div>
        </div>

        {/* RECORDED HISTORY */}
        <div className="rounded-xl border dark:border-white/10 border-gray-200 dark:bg-[#201A35] bg-white p-4 space-y-3">

          <div className="flex items-center justify-between gap-3">

            <div>
              <h4 className="text-xs font-semibold dark:text-gray-200 text-gray-700">
                Recorded execution history
              </h4>

              <p className="text-[10px] dark:text-gray-500 text-gray-400 mt-1">
                Select an event to inspect its execution step
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowHistory(value => !value)}
              className="flex items-center gap-1 text-xs font-medium text-viz-accent hover:underline"
              aria-expanded={showHistory}
            >
              {showHistory ? 'Hide' : 'Show'}
              <ChevronDown
                size={14}
                className={`transition-transform ${showHistory ? 'rotate-180' : ''}`}
              />
            </button>

          </div>

          {showHistory && (
            <div className="space-y-3">

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-lg dark:bg-white/[0.03] bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-xs dark:text-gray-400 text-gray-500">
                    <Repeat size={14} />
                    Body executions
                  </div>

                  <p className="text-xl font-bold font-mono dark:text-white text-gray-800 mt-1">
                    {iteration}
                  </p>
                </div>

                <div className="rounded-lg dark:bg-white/[0.03] bg-gray-50 p-3">
                  <div className="flex items-center gap-2 text-xs dark:text-gray-400 text-gray-500">
                    <Activity size={14} />
                    {isInfiniteFor ? 'Recorded executions' : 'Condition checks'}
                  </div>

                  <p className="text-xl font-bold font-mono dark:text-white text-gray-800 mt-1">
                    {evaluation}
                  </p>
                </div>

              </div>

              <div className="flex flex-wrap gap-2 pt-1">

                {visibleHistory.map((item, index) => {
                  const isSelected =
                    item.originalStep === currentStep;

                  const itemKnown =
                    item.conditionResult === true ||
                    item.conditionResult === false;
                  const itemTrue =
                    item.conditionResult === true;

                  return (
                    <button
                      key={`${item.loopId}-${item.originalStep}`}
                      type="button"
                      onClick={() => handleHistoryClick(item)}
                      disabled={!onSelectStep}
                      title={`Open execution step ${item.originalStep + 1}`}
                      className={`min-w-[64px] rounded-lg border px-3 py-2 text-left transition-all duration-200 ${
                        isSelected
                          ? 'border-viz-accent bg-viz-accent/10 shadow-md shadow-viz-accent/10'
                          : 'dark:border-white/10 border-gray-200 dark:bg-white/[0.02] bg-gray-50 hover:border-viz-accent/50'
                      } ${onSelectStep ? 'cursor-pointer' : 'cursor-default'}`}
                    >

                      <span className="block text-[10px] dark:text-gray-500 text-gray-400">
                        Event {index + 1}
                      </span>

                      <span className="block text-sm font-bold font-mono dark:text-gray-100 text-gray-800 mt-1">
                        #{item.iteration ?? '—'}
                      </span>

                      <span className={`block text-[9px] mt-1 ${
                        isInfiniteFor
                          ? 'text-teal-500'
                          : !itemKnown
                            ? 'text-gray-400'
                            : itemTrue
                              ? 'text-teal-500'
                              : 'text-amber-500'
                      }`}>
                        {isInfiniteFor
                          ? 'Recorded'
                          : !itemKnown
                            ? '—'
                            : itemTrue ? 'TRUE' : 'FALSE'}
                      </span>

                    </button>
                  );
                })}

              </div>

              {loopHistory.length === 0 && (
                <p className="text-[10px] dark:text-gray-500 text-gray-400">
                  Only the current event is available. More history appears when additional loop events are captured.
                </p>
              )}

              {selectedHistoryItem && (
                <p className="text-[10px] text-viz-accent">
                  Viewing execution step {selectedHistoryItem.originalStep + 1}
                </p>
              )}

            </div>
          )}

        </div>

        {/* EXPLANATION */}
        <div className={`rounded-xl border p-4 ${explanationBox}`}>

          <div className="flex items-start gap-3">

            <div className={`w-8 h-8 flex-shrink-0 rounded-lg flex items-center justify-center ${explanationIcon}`}>
              {loopContinues === false
                ? <Flag size={17} />
                : loopContinues === null
                  ? <Activity size={17} />
                  : <RotateCw size={17} />}
            </div>

            <div className="min-w-0">

              <h4 className="text-xs font-semibold dark:text-gray-100 text-gray-800">
                {isInfiniteFor
                  ? 'Unconditional execution'
                  : loopContinues === true
                    ? 'Loop continues'
                    : loopContinues === false
                      ? 'Loop exits'
                      : 'Result not captured'}
              </h4>

              <p className="text-xs leading-relaxed dark:text-gray-400 text-gray-500 mt-1">
                {explanation}
              </p>

            </div>

          </div>

        </div>

        {/* METADATA */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] dark:text-gray-500 text-gray-400">

          <span>
            Loop ID: <code className="font-mono">{event.loopId ?? 'Unavailable'}</code>
          </span>

          <span>
            Event line: {event.line ?? 'Unavailable'}
          </span>

        </div>

      </div>
    </section>
  );
}