import com.sun.jdi.Method;

public final class TraceHelperGenerator {

    private TraceHelperGenerator() {
    }

    public static String buildTraceHelperSource(String packageName) {

        StringBuilder source = new StringBuilder();

        if (packageName != null && !packageName.isBlank()) {
            source.append("package ")
                    .append(packageName)
                    .append(";\n");
        }

        source.append("""
                final class CodeVizRuntimeTrace {

                    private CodeVizRuntimeTrace() {
                    }

                    private static final class LoopState {
                        int iteration = 0;
                        int evaluation = 0;
                    }

                    private static final java.util.Map<String, LoopState>
                            LOOP_STATES = new java.util.HashMap<>();

                    /*
                     * Existing IF/ELSE tracking.
                     */
                    static boolean branch(
                            boolean condition,
                            int line,
                            String expression,
                            boolean hasElse
                    ) {
                        return condition;
                    }

                    /*
                     * Marker method detected by JDI.
                     */
                    static void loopEvent(
                            boolean condition,
                            int line,
                            String expression,
                            String loopId,
                            String loopType,
                            int iteration,
                            int evaluation
                    ) {
                        // JDI captures these actual arguments.
                    }

                    /*
                     * Normal FOR, WHILE and DO_WHILE tracking.
                     * State is keyed by loopId + thread + stack depth to
                     * prevent recursion or nested method calls from
                     * corrupting the iteration counters.
                     */
                    static synchronized boolean loop(
                            boolean condition,
                            int line,
                            String expression,
                            String loopId,
                            String loopType
                    ) {

                        int stackDepth = java.lang.Thread.currentThread()
                                .getStackTrace().length;

                        String stateKey = loopId + "@"
                                + java.lang.Thread.currentThread().getId()
                                + ":" + stackDepth;

                        LoopState state = LOOP_STATES.computeIfAbsent(
                                stateKey,
                                key -> new LoopState()
                        );

                        state.evaluation++;

                        if ("DO_WHILE".equals(loopType)) {

                            if (state.iteration == 0) {
                                state.iteration = 1;
                            } else if (condition) {
                                state.iteration++;
                            }

                        } else if (condition) {

                            state.iteration++;
                        }

                        int iteration = state.iteration;
                        int evaluation = state.evaluation;

                        loopEvent(
                                condition,
                                line,
                                expression,
                                loopId,
                                loopType,
                                iteration,
                                evaluation
                        );

                        /*
                         * Reset after the terminating condition.
                         */
                        if (!condition) {
                            LOOP_STATES.remove(stateKey);
                        }

                        return condition;
                    }

                    /*
                     * Handles for (;;) loops.
                     */
                    static synchronized void infiniteFor(
                            int line,
                            String loopId
                    ) {

                        int stackDepth = java.lang.Thread.currentThread()
                                .getStackTrace().length;

                        String stateKey = loopId + "@"
                                + java.lang.Thread.currentThread().getId()
                                + ":" + stackDepth;

                        LoopState state = LOOP_STATES.computeIfAbsent(
                                stateKey,
                                key -> new LoopState()
                        );

                        state.iteration++;
                        state.evaluation++;

                        loopEvent(
                                true,
                                line,
                                "for(;;)",
                                loopId,
                                "FOR",
                                state.iteration,
                                state.evaluation
                        );
                    }

                }
                """);

        return source.toString();
    }

    public static String getHelperClassName(String mainClass) {

        int lastDot = mainClass.lastIndexOf('.');

        String packageName =
                lastDot >= 0
                        ? mainClass.substring(0, lastDot + 1)
                        : "";

        return packageName + TraceConfig.TRACE_HELPER_NAME;
    }

    public static boolean isBranchTraceMethod(Method method) {

        return method != null
                && method.name().equals("branch")
                && method.declaringType().name().endsWith(
                        TraceConfig.TRACE_HELPER_NAME
                );
    }

    public static boolean isLoopEventMethod(Method method) {

        return method != null
                && method.name().equals("loopEvent")
                && method.declaringType().name().endsWith(
                        TraceConfig.TRACE_HELPER_NAME
                );
    }

    public static boolean isLoopTraceMethod(Method method) {

        return method != null
                && method.name().equals("loop")
                && method.declaringType().name().endsWith(
                        TraceConfig.TRACE_HELPER_NAME
                );
    }

    public static boolean isInfiniteForTraceMethod(Method method) {

        return method != null
                && method.name().equals("infiniteFor")
                && method.declaringType().name().endsWith(
                        TraceConfig.TRACE_HELPER_NAME
                );
    }

    public static boolean isTraceHelperMethod(Method method) {

        return method != null
                && method.declaringType().name().endsWith(
                        TraceConfig.TRACE_HELPER_NAME
                );
    }
}