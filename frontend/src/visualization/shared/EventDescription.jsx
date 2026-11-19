
import { Activity, ArrowDown, ArrowUp, Code2 } from 'lucide-react';

export default function EventDescription({ currentEvent, code }) {
  const eventType = currentEvent?.eventType || 'LINE';
  const method = currentEvent?.method || 'Unknown';

  const sourceLine =
    currentEvent?.line != null
      ? (code || '').split(/\r?\n/)[currentEvent.line - 1]?.trim()
      : '';

  let title = 'Executing source line';
  let description = `Currently executing ${method}().`;
  let color = 'text-blue-500';
  let icon = <Code2 size={17} />;

  if (eventType === 'METHOD_ENTRY') {
    title = `Entering ${method}()`;
    description = currentEvent.caller
      ? `${currentEvent.caller}() called ${method}().`
      : `${method}() started execution.`;

    color = 'text-viz-mid';
    icon = <ArrowDown size={17} />;
  } else if (eventType === 'METHOD_EXIT') {
    title = `Leaving ${method}()`;
    description = currentEvent.caller
      ? `Execution returns from ${method}() to ${currentEvent.caller}().`
      : `${method}() completed execution.`;

    color = 'text-green-500';
    icon = <ArrowUp size={17} />;
  } else if (eventType === 'BRANCH') {
    const result = currentEvent.conditionResult === true;

    title = `if condition evaluated: ${result ? 'TRUE' : 'FALSE'}`;

    description = result
      ? 'Java selected the IF branch because the condition evaluated to true.'
      : currentEvent.branchTaken === 'ELSE'
        ? 'Java selected the ELSE branch because the condition evaluated to false.'
        : 'The condition evaluated to false, so Java skipped the IF block.';

    color = result ? 'text-green-500' : 'text-amber-500';
    icon = <Activity size={17} />;
  } else if (eventType === 'LOOP_CONDITION') {
    const result = currentEvent.conditionResult === true;

    const loopName = {
      WHILE: 'while',
      FOR: 'for',
      DO_WHILE: 'do-while',
    }[currentEvent.loopType] || 'loop';

    title = `${loopName} condition: ${result ? 'TRUE' : 'FALSE'}`;

    description = result
      ? `The ${loopName} condition is true. The loop can continue.`
      : `The ${loopName} condition is false. The loop will stop repeating.`;

    color = result ? 'text-green-500' : 'text-amber-500';
    icon = <Activity size={17} />;
  }

  return (
    <section className="rounded-xl border dark:border-dark-border border-light-border dark:bg-dark-elevated bg-white p-4">
      <div className={`flex items-center gap-2 mb-2 ${color}`}>
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>

      <p className="text-sm dark:text-gray-300 text-gray-600">
        {description}
      </p>

      {currentEvent?.line != null && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">
            Currently executing · Line {currentEvent.line}
          </p>

          {sourceLine && (
            <pre className="text-xs font-mono whitespace-pre-wrap break-all rounded-lg dark:bg-dark-bg bg-gray-100 dark:text-gray-300 text-gray-700 p-3">
              {sourceLine}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
