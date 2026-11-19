
import com.sun.jdi.*;

import java.util.*;

public final class EventCapture {

    private EventCapture() {
    }

    public static Map<String, Object> captureLineEvent(
            int step,
            ThreadReference thread,
            Location location
    ) {

        List<Object> stack = FrameCapture.captureStack(thread);

        return JsonUtils.map(
                "eventType", "LINE",
                "step", step,
                "line", location.lineNumber(),
                "method", location.method().name(),
                "class", location.declaringType().name(),
                "thread", thread.name(),
                "stackDepth", stack.size(),
                "stack", stack
        );
    }

    public static Map<String, Object> captureMethodArguments(
            ThreadReference thread,
            Method method
    ) {

        Map<String, Object> arguments = new LinkedHashMap<>();
        Set<Long> visited = new HashSet<>();

        try {

            StackFrame frame = thread.frame(0);

            List<LocalVariable> parameters = method.arguments();

            Map<LocalVariable, Value> values =
                    frame.getValues(parameters);

            for (LocalVariable parameter : parameters) {

                arguments.put(
                        parameter.name(),
                        RuntimeValueCapture.captureValue(
                                values.get(parameter),
                                0,
                                visited
                        )
                );
            }

        } catch (Exception ignored) {
        }

        return arguments;
    }

    public static Value getArgumentValue(
            ThreadReference thread,
            Method method,
            String argumentName
    ) {

        try {

            StackFrame frame = thread.frame(0);

            List<LocalVariable> parameters = method.arguments();

            Map<LocalVariable, Value> values =
                    frame.getValues(parameters);

            for (LocalVariable parameter : parameters) {

                if (parameter.name().equals(argumentName)) {
                    return values.get(parameter);
                }
            }

        } catch (Exception ignored) {
        }

        return null;
    }

    private static int getIntArgument(
            ThreadReference thread,
            Method method,
            String argumentName,
            int defaultValue
    ) {

        Value value = getArgumentValue(
                thread,
                method,
                argumentName
        );

        return value instanceof IntegerValue
                ? ((IntegerValue) value).value()
                : defaultValue;
    }

    private static String getStringArgument(
            ThreadReference thread,
            Method method,
            String argumentName,
            String defaultValue
    ) {

        Value value = getArgumentValue(
                thread,
                method,
                argumentName
        );

        return value instanceof StringReference
                ? ((StringReference) value).value()
                : defaultValue;
    }

    private static boolean getBooleanArgument(
            ThreadReference thread,
            Method method,
            String argumentName
    ) {

        Value value = getArgumentValue(
                thread,
                method,
                argumentName
        );

        return value instanceof BooleanValue
                && ((BooleanValue) value).value();
    }

    private static List<Object> getUserStack(
            ThreadReference thread
    ) {

        List<Object> fullStack =
                FrameCapture.captureStack(thread);

        List<Object> userStack = new ArrayList<>();

        for (Object frame : fullStack) {

            if (!(frame instanceof Map<?, ?> frameMap)) {
                userStack.add(frame);
                continue;
            }

            Object className = frameMap.get("class");

            if (className != null
                    && className.toString()
                    .endsWith("CodeVizRuntimeTrace")) {

                continue;
            }

            userStack.add(frame);
        }

        return userStack;
    }

    private static String getActiveMethod(
            List<Object> stack
    ) {

        if (!stack.isEmpty()
                && stack.get(0) instanceof Map<?, ?> frame) {

            Object method = frame.get("method");

            if (method != null) {
                return method.toString();
            }
        }

        return "Unknown";
    }

    private static String getActiveClass(
            List<Object> stack
    ) {

        if (!stack.isEmpty()
                && stack.get(0) instanceof Map<?, ?> frame) {

            Object className = frame.get("class");

            if (className != null) {
                return className.toString();
            }
        }

        return "Unknown";
    }

    public static Map<String, Object> captureBranchEvent(
            int step,
            ThreadReference thread,
            Method method
    ) {

        List<Object> fullStack =
                FrameCapture.captureStack(thread);

        List<Object> userStack = fullStack.size() > 1
                ? new ArrayList<>(
                        fullStack.subList(1, fullStack.size())
                )
                : fullStack;

        Map<String, Object> arguments =
                captureMethodArguments(thread, method);

        Value conditionValue =
                getArgumentValue(thread, method, "condition");

        Value lineValue =
                getArgumentValue(thread, method, "line");

        Value expressionValue =
                getArgumentValue(thread, method, "expression");

        Value hasElseValue =
                getArgumentValue(thread, method, "hasElse");

        boolean conditionResult =
                conditionValue instanceof BooleanValue
                        && ((BooleanValue) conditionValue).value();

        int branchLine =
                lineValue instanceof IntegerValue
                        ? ((IntegerValue) lineValue).value()
                        : -1;

        String expression =
                expressionValue instanceof StringReference
                        ? ((StringReference) expressionValue).value()
                        : "Condition";

        boolean hasElse =
                hasElseValue instanceof BooleanValue
                        && ((BooleanValue) hasElseValue).value();

        String branchTaken = conditionResult
                ? "THEN"
                : hasElse ? "ELSE" : "SKIP";

        String activeMethod = "Unknown";
        String activeClass = "Unknown";

        if (!userStack.isEmpty()
                && userStack.get(0) instanceof Map<?, ?> activeFrame) {

            Object methodName = activeFrame.get("method");
            Object className = activeFrame.get("class");

            if (methodName != null) {
                activeMethod = methodName.toString();
            }

            if (className != null) {
                activeClass = className.toString();
            }
        }

        return JsonUtils.map(
                "eventType", "BRANCH",
                "step", step,
                "line", branchLine,
                "method", activeMethod,
                "class", activeClass,
                "thread", thread.name(),
                "stackDepth", userStack.size(),
                "stack", userStack,
                "branchType", "IF",
                "conditionExpression", expression,
                "conditionResult", conditionResult,
                "branchTaken", branchTaken,
                "hasElse", hasElse,
                "arguments", arguments
        );
    }

    /*
     * Captures loopEvent(...) marker calls.
     *
     * Expected helper arguments:
     * condition, line, expression, loopId,
     * loopType, iteration, evaluation
     */
    public static Map<String, Object> captureLoopEvent(
            int step,
            ThreadReference thread,
            Method method
    ) {

        List<Object> userStack = getUserStack(thread);

        boolean conditionResult =
                getBooleanArgument(
                        thread,
                        method,
                        "condition"
                );

        int loopLine =
                getIntArgument(
                        thread,
                        method,
                        "line",
                        -1
                );

        String expression =
                getStringArgument(
                        thread,
                        method,
                        "expression",
                        "Loop condition"
                );

        String loopId =
                getStringArgument(
                        thread,
                        method,
                        "loopId",
                        "UNKNOWN_LOOP"
                );

        String loopType =
                getStringArgument(
                        thread,
                        method,
                        "loopType",
                        "WHILE"
                );

        int iteration =
                getIntArgument(
                        thread,
                        method,
                        "iteration",
                        0
                );

        int evaluation =
                getIntArgument(
                        thread,
                        method,
                        "evaluation",
                        0
                );

        String loopAction = conditionResult
                ? "CONTINUE"
                : "EXIT";

        Map<String, Object> arguments =
                new LinkedHashMap<>();

        arguments.put("loopId", loopId);
        arguments.put("loopType", loopType);
        arguments.put("iteration", iteration);
        arguments.put("evaluation", evaluation);

        return JsonUtils.map(
                "eventType", "LOOP_CONDITION",
                "step", step,
                "line", loopLine,
                "method", getActiveMethod(userStack),
                "class", getActiveClass(userStack),
                "thread", thread.name(),
                "stackDepth", userStack.size(),
                "stack", userStack,
                "loopId", loopId,
                "loopType", loopType,
                "conditionExpression", expression,
                "conditionResult", conditionResult,
                "iteration", iteration,
                "evaluation", evaluation,
                "loopAction", loopAction,
                "arguments", arguments
        );
    }

    public static Map<String, Object> captureMethodEvent(
            int step,
            ThreadReference thread,
            Method method,
            String eventType,
            Value returnValue,
            boolean returnValueAvailable
    ) {

        List<Object> stack =
                FrameCapture.captureStack(thread);

        Map<String, Object> arguments =
                eventType.equals("METHOD_ENTRY")
                        ? captureMethodArguments(thread, method)
                        : new LinkedHashMap<>();

        String caller = null;

        if (stack.size() > 1) {

            caller = (String) ((Map<?, ?>) stack.get(1))
                    .get("method");
        }

        Map<String, Object> result = JsonUtils.map(
                "eventType", eventType,
                "step", step,
                "method", method.name(),
                "class", method.declaringType().name(),
                "signature", method.signature(),
                "caller", caller,
                "arguments", arguments,
                "thread", thread.name(),
                "stackDepth", stack.size(),
                "stack", stack
        );

        if (eventType.equals("METHOD_EXIT")) {

            result.put(
                    "returnValueAvailable",
                    returnValueAvailable
            );

            result.put(
                    "returnValue",
                    returnValueAvailable
                            ? RuntimeValueCapture.captureValue(
                                    returnValue,
                                    0,
                                    new HashSet<>()
                            )
                            : null
            );
        }

        return result;
    }
}
