import com.sun.jdi.*;
import com.sun.jdi.connect.*;
import com.sun.jdi.event.*;
import com.sun.jdi.request.*;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.*;

public final class JdiExecutionManager {

    private JdiExecutionManager() {
    }

    /*
     * Safety limits.
     *
     * RECURSION_DEPTH_LIMIT: a healthy educational program never needs
     * a call stack this deep. Crossing it means runaway recursion.
     * WALL_CLOCK_LIMIT_MS: protects against programs that block or
     * produce no events at all.
     */
    private static final int RECURSION_DEPTH_LIMIT = 120;
    private static final long WALL_CLOCK_LIMIT_MS = 20000;

    private static void printErrorResponse(String message) {

        System.out.println(
                JsonUtils.json(
                        JsonUtils.map(
                                "output", "",
                                "error", message,
                                "events", Collections.emptyList()
                        )
                )
        );
    }

    /*
     * Final event that tells the frontend (and the student) WHY
     * execution stopped early.
     */
    private static Map<String, Object> stopEvent(int step, String reason) {

        return JsonUtils.map(
                "eventType", "EXECUTION_STOPPED",
                "step", step,
                "reason", reason
        );
    }

    private static void recordEvent(
            List<Object> events,
            Map<String, Object> captured
    ) {

        events.add(captured);
    }

    private static boolean isTraceHelperMethod(
            Method method,
            String helperClassName
    ) {

        if (method == null) {
            return false;
        }

        String typeName = method.declaringType().name();

        return typeName.equals(helperClassName)
                || typeName.startsWith(helperClassName + "$");
    }

    private static boolean isLoopEventLocation(
            Location location,
            String helperClassName
    ) {

        if (location == null) {
            return false;
        }

        Method method = location.method();

        return method != null
                && method.name().equals("loopEvent")
                && method.declaringType().name()
                        .equals(helperClassName);
    }

    public static void execute(
            String targetDirectory,
            String mainClass,
            Path sourcePath
    ) throws Exception {

        Path targetPath = Path.of(targetDirectory);

        String compileError =
                SourceInstrumenter.instrumentAndCompile(
                        sourcePath,
                        targetPath
                );

        if (compileError != null) {
            printErrorResponse(compileError);
            return;
        }

        String helperClassName =
                TraceHelperGenerator.getHelperClassName(mainClass);

        LaunchingConnector connector =
                Bootstrap.virtualMachineManager()
                        .defaultConnector();

        Map<String, Connector.Argument> launchArguments =
                connector.defaultArguments();

        launchArguments.get("main").setValue(mainClass);

        launchArguments.get("options").setValue(
                "-cp \"" + targetDirectory + "\""
        );

        launchArguments.get("suspend").setValue("true");

        VirtualMachine vm = connector.launch(launchArguments);

        Process process = vm.process();

        ByteArrayOutputStream output =
                new ByteArrayOutputStream();

        ByteArrayOutputStream errorOutput =
                new ByteArrayOutputStream();

        Thread outputReader = new Thread(() -> {

            try (InputStream input = process.getInputStream()) {

                input.transferTo(output);

            } catch (IOException ignored) {
            }

        });

        Thread errorReader = new Thread(() -> {

            try (InputStream input = process.getErrorStream()) {

                input.transferTo(errorOutput);

            } catch (IOException ignored) {
            }

        });

        outputReader.start();
        errorReader.start();

        List<Object> events = new ArrayList<>();

        EventRequestManager manager =
                vm.eventRequestManager();

        ClassPrepareRequest prepareRequest =
                manager.createClassPrepareRequest();

        prepareRequest.addClassFilter(mainClass);

        prepareRequest.setSuspendPolicy(
                EventRequest.SUSPEND_ALL
        );

        prepareRequest.enable();

        /*
         * The loopEvent() marker lives inside the helper, which is
         * excluded from line stepping. A breakpoint fires independently
         * of stepping, so we use one to capture loop conditions.
         */
        ClassPrepareRequest helperPrepareRequest =
                manager.createClassPrepareRequest();

        helperPrepareRequest.addClassFilter(helperClassName);

        helperPrepareRequest.setSuspendPolicy(
                EventRequest.SUSPEND_ALL
        );

        helperPrepareRequest.enable();

        int step = 0;
        boolean finished = false;
        boolean stopReported = false;

        /*
         * Recursion depth is counted from method entry/exit pairs,
         * not read from captured stacks, so it is always exact.
         */
        int[] currentDepth = {0};
        int[] maxDepth = {0};

        long startTime = System.currentTimeMillis();

        try {

            while (!finished
                    && events.size() < TraceConfig.MAX_STEPS) {

                EventSet eventSet;

                try {

                    eventSet = vm.eventQueue().remove(5000);

                } catch (VMDisconnectedException exception) {

                    break;
                }

                if (eventSet == null) {

                    boolean timedOut =
                            System.currentTimeMillis() - startTime
                                    > WALL_CLOCK_LIMIT_MS;

                    if (!process.isAlive() || timedOut) {
                        break;
                    }

                    continue;
                }

                for (Event event : eventSet) {

                    if (events.size() >= TraceConfig.MAX_STEPS) {
                        finished = true;
                        break;
                    }

                    /*
                     * A traced class was loaded.
                     */
                    if (event instanceof ClassPrepareEvent prepared) {

                        ReferenceType type =
                                prepared.referenceType();

                        if (type.name().equals(helperClassName)) {

                            List<Method> loopEventMethods =
                                    type.methodsByName("loopEvent");

                            if (!loopEventMethods.isEmpty()) {

                                try {

                                    BreakpointRequest loopBreakpoint =
                                            manager.createBreakpointRequest(
                                                    loopEventMethods.get(0)
                                                            .location()
                                            );

                                    loopBreakpoint.setSuspendPolicy(
                                            EventRequest.SUSPEND_EVENT_THREAD
                                    );

                                    loopBreakpoint.enable();

                                } catch (Exception ignored) {

                                    // Marker has no executable location.
                                }
                            }

                        } else if (type.name().equals(mainClass)) {

                            JdiEventManager.enableMethodTracing(
                                    vm,
                                    manager
                            );

                            List<Method> methods =
                                    type.methodsByName(
                                            "main",
                                            "([Ljava/lang/String;)V"
                                    );

                            if (!methods.isEmpty()) {

                                BreakpointRequest breakpoint =
                                        manager.createBreakpointRequest(
                                                methods.get(0).location()
                                        );

                                breakpoint.setSuspendPolicy(
                                        EventRequest.SUSPEND_EVENT_THREAD
                                );

                                breakpoint.enable();
                            }
                        }
                    }

                    /*
                     * Breakpoint hit: either the loopEvent marker or
                     * the main-method entry point.
                     */
                    else if (event instanceof BreakpointEvent breakpoint) {

                        if (isLoopEventLocation(
                                breakpoint.location(),
                                helperClassName
                        )) {

                            recordEvent(
                                    events,
                                    EventCapture.captureLoopEvent(
                                            ++step,
                                            breakpoint.thread(),
                                            breakpoint.location().method()
                                    )
                            );

                        } else {

                            JdiEventManager.enableNextStep(
                                    manager,
                                    breakpoint.thread(),
                                    helperClassName
                            );
                        }
                    }

                    /*
                     * Method entry events.
                     */
                    else if (event instanceof MethodEntryEvent entry) {

                        Method method = entry.method();

                        if (TraceHelperGenerator.isBranchTraceMethod(
                                method
                        )) {

                            recordEvent(
                                    events,
                                    EventCapture.captureBranchEvent(
                                            ++step,
                                            entry.thread(),
                                            method
                                    )
                            );
                        }

                        else if (isTraceHelperMethod(
                                method,
                                helperClassName
                        )) {

                            // Internal tracing method; do not expose it.
                        }

                        else {

                            currentDepth[0] += 1;

                            if (currentDepth[0] > maxDepth[0]) {
                                maxDepth[0] = currentDepth[0];
                            }

                            recordEvent(
                                    events,
                                    EventCapture.captureMethodEvent(
                                            ++step,
                                            entry.thread(),
                                            method,
                                            "METHOD_ENTRY",
                                            null,
                                            false
                                    )
                            );
                        }
                    }

                    /*
                     * Method exit events.
                     */
                    else if (event instanceof MethodExitEvent exit) {

                        Method method = exit.method();

                        if (isTraceHelperMethod(
                                method,
                                helperClassName
                        )) {

                            continue;
                        }

                        Value returned = null;
                        boolean available = false;

                        try {

                            returned = exit.returnValue();
                            available = true;

                        } catch (UnsupportedOperationException ignored) {

                            // The VM may not expose method return values.

                        } catch (Exception ignored) {
                        }

                        currentDepth[0] = Math.max(0, currentDepth[0] - 1);

                        recordEvent(
                                events,
                                EventCapture.captureMethodEvent(
                                        ++step,
                                        exit.thread(),
                                        method,
                                        "METHOD_EXIT",
                                        returned,
                                        available
                                )
                        );
                    }

                    /*
                     * Line-by-line execution events.
                     */
                    else if (event instanceof StepEvent stepEvent) {

                        StepRequest oldRequest =
                                (StepRequest) stepEvent.request();

                        manager.deleteEventRequest(oldRequest);

                        try {

                            recordEvent(
                                    events,
                                    EventCapture.captureLineEvent(
                                            ++step,
                                            stepEvent.thread(),
                                            stepEvent.location()
                                    )
                            );

                            if (events.size() < TraceConfig.MAX_STEPS) {

                                JdiEventManager.enableNextStep(
                                        manager,
                                        stepEvent.thread(),
                                        helperClassName
                                );
                            }

                        } catch (Exception ignored) {
                        }
                    }

                    /*
                     * Program termination.
                     */
                    else if (event instanceof VMDeathEvent
                            || event instanceof VMDisconnectEvent) {

                        finished = true;
                    }
                }

                /*
                 * Safety nets, checked after every batch of events.
                 */
                if (!stopReported) {

                    if (maxDepth[0] >= RECURSION_DEPTH_LIMIT) {

                        events.add(stopEvent(
                                ++step,
                                "Possible infinite recursion detected: the call "
                                        + "stack grew to " + maxDepth[0]
                                        + " frames. CodeViz stopped execution."
                        ));
                        stopReported = true;
                        finished = true;

                    } else if (events.size() >= TraceConfig.MAX_STEPS) {

                        events.add(stopEvent(
                                ++step,
                                "Step limit reached ("
                                        + TraceConfig.MAX_STEPS
                                        + " recorded steps). The program may "
                                        + "contain an infinite loop. CodeViz "
                                        + "stopped execution."
                        ));
                        stopReported = true;
                        finished = true;

                    } else if (System.currentTimeMillis() - startTime
                            > WALL_CLOCK_LIMIT_MS) {

                        events.add(stopEvent(
                                ++step,
                                "Execution time limit reached. The program "
                                        + "appears to be blocked or running "
                                        + "forever. CodeViz stopped execution."
                        ));
                        stopReported = true;
                        finished = true;
                    }
                }

                eventSet.resume();
            }

        } finally {

            try {
                vm.dispose();
            } catch (Exception ignored) {
            }

            /*
             * Guarantee the debugged program really dies, even if the
             * connection misbehaves. No orphan JVM processes.
             */
            try {
                process.destroyForcibly();
            } catch (Exception ignored) {
            }
        }

        outputReader.join(2000);
        errorReader.join(2000);

        /*
         * A recursion that crashes before our depth limit shows up as
         * a StackOverflowError on stderr. Report it clearly.
         */
        String errorText = errorOutput.toString(StandardCharsets.UTF_8);

        if (!stopReported && errorText.contains("StackOverflowError")) {

            events.add(stopEvent(
                    ++step,
                    "The program crashed with StackOverflowError. This usually "
                            + "means infinite recursion - a missing or "
                            + "unreachable base case."
            ));
            stopReported = true;
        }

        Map<String, Object> response = JsonUtils.map(
                "output",
                output.toString(StandardCharsets.UTF_8),
                "error",
                "",
                "events",
                events
        );

        System.out.println(JsonUtils.json(response));
    }
}