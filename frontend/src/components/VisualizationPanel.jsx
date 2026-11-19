import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  ChevronDown,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  RotateCcw,
  StepBack,
  StepForward,
  Database,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import EventDescription from '../visualization/shared/EventDescription';
import BranchDecision from '../visualization/branches/BranchDecision';
import LoopVisualization from '../visualization/loops/LoopVisualization';
import ArrayVisualization from '../visualization/arrays/ArrayVisualization';
import GridVisualization from '../visualization/arrays/GridVisualization';

import VariableInspector from '../visualization/shared/VariableInspector';

import CallStackView, {
  ExecutionStoppedBanner,
} from '../visualization/runtime/CallStackView';

import {
  ArgumentsView,
  ReturnView,
} from '../visualization/runtime/ArgumentsView';

import {
  getArrayEntries,
  getGridEntries,
  getFrameVariables,
} from '../visualization/shared/runtimeUtils';


/* --------------------------------------------------
   VISUALIZATION PANEL
-------------------------------------------------- */

function getArrayLength(value) {
  if (typeof value?.length === 'number') return value.length;
  if (Array.isArray(value?.elements)) return value.elements.length;
  return 0;
}

function getFrameKey(event) {
  if (!event) return null;

  const topFrame = event.stack?.[0];
  const method = event.method || topFrame?.method;
  if (!method) return null;

  const depth =
    event.stackDepth ??
    (Array.isArray(event.stack) ? event.stack.length : null);

  return `${method}@${depth ?? 'unknown'}`;
}

function getEventVariables(event) {
  return event?.stack?.[0]?.variables || event?.variables || {};
}

export default function VisualizationPanel({
  currentStep,
  totalSteps,
  currentEvent,
  events = [],
  code,
  isPlaying,
  speed,
  setSpeed,
  onPlayPause,
  onNext,
  onPrev,
  onFirst,
  onLast,
  onReset,
  onSeek,
}) {
  const [viewMode, setViewMode] = useState('auto');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') setExpanded(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  /* -----------------------------------------------
     RUNTIME DATA
  ------------------------------------------------ */

  const stack = currentEvent?.stack || [];
  const activeFrame = stack[0];

  const variables = getEventVariables(currentEvent);

  const method =
    currentEvent?.method ||
    activeFrame?.method ||
    'Unknown';

  const eventType = currentEvent?.eventType || 'LINE';

  const stackDepth = currentEvent?.stackDepth ?? stack.length;

  const previousEvent =
    currentStep > 0
      ? events[currentStep - 1]
      : null;

  const currentFrameKey = getFrameKey(currentEvent);

  let previousVariables = {};

  if (currentFrameKey == null) {
    previousVariables = getFrameVariables(previousEvent);
  } else if (eventType !== 'METHOD_ENTRY') {
    for (let i = currentStep - 1; i >= 0; i -= 1) {
      const candidate = events[i];
      if (getFrameKey(candidate) === currentFrameKey) {
        previousVariables = getEventVariables(candidate);
        break;
      }
    }
  }

  const grids = getGridEntries(variables);
  const gridNames = new Set(grids.map(([name]) => name));

  const arrays = getArrayEntries(variables).filter(
    ([name, value]) => getArrayLength(value) > 0 && !gridNames.has(name)
  );

  const activeGrid = grids.length > 0 ? grids[0] : null;
  const gridName = activeGrid?.[0];
  const gridValue = activeGrid?.[1];
  const previousGridValue = previousVariables?.[gridName];


  /* -----------------------------------------------
     VIEW SELECTION
  ------------------------------------------------ */

  const effectiveView =
    viewMode === 'auto'
      ? grids.length > 0
        ? 'grid'
        : arrays.length > 0
          ? 'array'
          : 'runtime'
      : viewMode === 'grid'
        ? grids.length > 0
          ? 'grid'
          : 'runtime'
        : viewMode === 'array' || viewMode === 'pointers'
          ? arrays.length > 0
            ? viewMode
            : 'runtime'
          : 'runtime';

  const viewOptions = [
    { value: 'auto', label: 'Automatic view' },
    { value: 'grid', label: 'Grid / Matrix', disabled: grids.length === 0 },
    { value: 'array', label: 'Array structure', disabled: arrays.length === 0 },
    { value: 'pointers', label: 'Pointer flow', disabled: arrays.length === 0 },
    { value: 'runtime', label: 'Runtime state' },
  ];


  /* -----------------------------------------------
     PLAYBACK SPEEDS
  ------------------------------------------------ */

  const delays = [
    { value: '0.25x', label: '0.25x' },
    { value: '0.5x', label: '0.5x' },
    { value: '0.75x', label: '0.75x' },
    { value: '1.0x', label: '1.0x' },
    { value: '1.5x', label: '1.5x' },
    { value: '2.0x', label: '2.0x' },
  ];


  const shellClasses = expanded
    ? 'codeviz-panel flex flex-col overflow-hidden dark:bg-dark-bg bg-white'
    : 'codeviz-panel flex flex-col h-full overflow-hidden relative';

  const shellStyle = expanded
    ? {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
      }
    : undefined;

  const workspaceColumns = expanded
    ? 'lg:grid-cols-2'
    : 'xl:grid-cols-2';

  const spanBoth = expanded
    ? 'lg:col-span-2'
    : 'xl:col-span-2';


  const panel = (
    <div className={shellClasses} style={shellStyle}>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b dark:border-dark-border border-light-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative">
            <select
              value={viewMode}
              onChange={event => setViewMode(event.target.value)}
              className="appearance-none bg-transparent dark:text-gray-200 text-gray-700 font-medium text-sm pr-8 pl-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer outline-none"
            >
              {viewOptions.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none dark:text-gray-400 text-gray-500"
            />
          </div>
          <span className="hidden sm:inline-flex px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-viz-accent/10 text-viz-accent">
            {viewMode === 'auto' ? 'Auto' : 'Manual'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs dark:text-gray-500 text-gray-400">Speed</span>
          <select
            value={speed}
            onChange={event => setSpeed(event.target.value)}
            className="text-xs dark:bg-dark-elevated dark:text-gray-300 dark:border-dark-border bg-white text-gray-600 border border-light-border rounded-lg px-2 py-1.5 outline-none"
          >
            {delays.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setExpanded(value => !value)}
            title={expanded ? 'Exit full screen (Esc)' : 'Expand visualization'}
            className="w-8 h-8 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>


      <div className="flex-1 p-4 sm:p-5 overflow-auto dark:bg-dark-bg/20 bg-gray-50/30 min-h-0 space-y-4 relative transition-all duration-300">

        {!currentEvent ? (

          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-viz-accent/20 to-viz-mid/20 flex items-center justify-center">
              <Database size={32} className="text-viz-accent" />
            </div>
            <h3 className="text-lg font-semibold dark:text-gray-200 text-gray-700">
              Visualization Ready
            </h3>
            <p className="text-sm dark:text-gray-400 text-gray-500 max-w-xs mt-2">
              Click Visualize to explore your Java code execution step-by-step.
            </p>
          </div>

        ) : (

          <div className="space-y-4 relative">

            {eventType === 'EXECUTION_STOPPED' && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <ExecutionStoppedBanner event={currentEvent} />
              </div>
            )}

            <div className="transition-opacity duration-300">
              <EventDescription
                currentEvent={currentEvent}
                code={code}
              />
            </div>

            <div className={`grid grid-cols-1 gap-4 items-start ${workspaceColumns}`}>

              <div className="space-y-4 min-w-0">

                {eventType === 'BRANCH' && (
                  <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                    <BranchDecision event={currentEvent} />
                  </div>
                )}

                {(eventType === 'LOOP_CONDITION' || currentEvent.loopId != null) && (
                  <div className="space-y-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                    <LoopVisualization
                      event={currentEvent}
                      events={events}
                      currentStep={currentStep}
                      onSelectStep={onSeek}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-3 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Active Method</p>
                    <p className="font-mono text-sm dark:text-gray-200 text-gray-700 font-semibold">
                      {method}()
                    </p>
                  </div>

                  <div className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-3 shadow-sm">
                    <p className="text-xs text-gray-400 mb-1">Call Stack Depth</p>
                    <p className="font-mono text-sm dark:text-gray-200 text-gray-700 font-semibold">
                      {stackDepth}
                    </p>
                  </div>
                </div>

                {eventType === 'METHOD_ENTRY' && (
                  <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                    <ArgumentsView argumentsData={currentEvent.arguments} />
                  </div>
                )}

                {eventType === 'METHOD_EXIT' && (
                  <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                    <ReturnView
                      value={currentEvent.returnValue}
                      available={currentEvent.returnValueAvailable}
                      method={method}
                    />
                  </div>
                )}

                {currentEvent.caller && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                    <ArrowRight size={14} />
                    Called from:
                    <span className="font-mono dark:text-gray-300 text-gray-700">
                      {currentEvent.caller}()
                    </span>
                  </div>
                )}

              </div>

              <div className="space-y-4 min-w-0">
                <VariableInspector
                  variables={variables}
                  previousVariables={previousVariables}
                />
              </div>

              {effectiveView === 'grid' && grids.length > 0 && (
                <div className={`${spanBoth} min-w-0 transition-all duration-300`}>
                  <GridVisualization
                    gridName={gridName}
                    gridValue={gridValue}
                    previousGridValue={previousGridValue}
                    variables={variables}
                    previousVariables={previousVariables}
                    currentEvent={currentEvent}
                    code={code}
                  />
                </div>
              )}

              {(effectiveView === 'array' || effectiveView === 'pointers') &&
                arrays.length > 0 && (
                <div className={`${spanBoth} min-w-0 transition-all duration-300`}>
                  <ArrayVisualization
                    arrays={arrays}
                    variables={variables}
                    previousVariables={previousVariables}
                    code={code}
                    showPointerDetails={effectiveView === 'pointers'}
                    currentEvent={currentEvent}
                  />
                </div>
              )}

              {stackDepth > 1 && (
                <div className={`${spanBoth} min-w-0 transition-all duration-300`}>
                  <CallStackView
                    currentEvent={currentEvent}
                    events={events}
                    currentStep={currentStep}
                  />
                </div>
              )}

            </div>

          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-2 border-t dark:border-dark-border border-light-border flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={onFirst}
              disabled={!totalSteps}
              title="First step"
              className="w-8 h-9 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
            >
              <SkipBack size={15} />
            </button>

            <button
              onClick={onPrev}
              disabled={!totalSteps || currentStep === 0}
              title="Previous step"
              className="w-8 h-9 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
            >
              <StepBack size={15} />
            </button>

            <button
              onClick={onPlayPause}
              disabled={!totalSteps}
              title={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 rounded-xl flex items-center justify-center dark:bg-viz-mid dark:text-white bg-viz-accent text-white hover:opacity-90 disabled:opacity-30 shadow-sm"
            >
              {isPlaying ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              disabled={!totalSteps || currentStep >= totalSteps - 1}
              title="Next step"
              className="w-8 h-9 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
            >
              <StepForward size={15} />
            </button>

            <button
              onClick={onLast}
              disabled={!totalSteps}
              title="Last step"
              className="w-8 h-9 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
            >
              <SkipForward size={15} />
            </button>

            <button
              onClick={onReset}
              disabled={!totalSteps}
              title="Return to first step"
              className="w-8 h-9 rounded-lg flex items-center justify-center dark:text-gray-400 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          <div className="text-right flex-shrink-0 pl-1">
            <div className="text-lg font-bold dark:text-gray-200 text-gray-700 font-mono whitespace-nowrap">
              {totalSteps ? currentStep + 1 : 0}
              <span className="dark:text-gray-500 text-gray-400 text-xs font-normal">
                {' '}/ {totalSteps}
              </span>
            </div>
            <div className="text-xs dark:text-gray-500 text-gray-400">Step</div>
          </div>
        </div>

        <div className="pt-3 pb-1">
          <input
            type="range"
            min="0"
            max={Math.max(totalSteps - 1, 0)}
            value={totalSteps ? currentStep : 0}
            disabled={!totalSteps}
            onChange={event => onSeek(Number(event.target.value))}
            className="w-full h-1.5 cursor-pointer accent-viz-accent disabled:opacity-30"
            aria-label="Execution timeline"
          />

          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Start</span>
            <span>Drag to inspect any execution step</span>
            <span>End</span>
          </div>
        </div>
      </div>

    </div>
  );

  return expanded ? createPortal(panel, document.body) : panel;
}