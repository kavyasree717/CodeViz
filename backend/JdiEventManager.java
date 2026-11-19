
import com.sun.jdi.ThreadReference;
import com.sun.jdi.VirtualMachine;

import com.sun.jdi.request.EventRequest;
import com.sun.jdi.request.EventRequestManager;
import com.sun.jdi.request.MethodEntryRequest;
import com.sun.jdi.request.MethodExitRequest;
import com.sun.jdi.request.StepRequest;

import java.util.List;

public final class JdiEventManager {

    private JdiEventManager() {
    }

    /*
     * Enables line-by-line execution tracing.
     *
     * Internal Java classes and the generated tracing helper
     * are excluded from line stepping.
     *
     * Method-entry tracing remains responsible for capturing
     * the loopEvent() marker inside the helper.
     */
    public static void enableNextStep(
            EventRequestManager manager,
            ThreadReference thread,
            String helperClassName
    ) {

        StepRequest request = manager.createStepRequest(
                thread,
                StepRequest.STEP_LINE,
                StepRequest.STEP_INTO
        );

        request.addClassExclusionFilter("java.*");
        request.addClassExclusionFilter("javax.*");
        request.addClassExclusionFilter("jdk.*");
        request.addClassExclusionFilter("sun.*");
        request.addClassExclusionFilter("com.sun.*");

        if (helperClassName != null
                && !helperClassName.isBlank()) {

            request.addClassExclusionFilter(helperClassName);
        }

        request.addCountFilter(1);

        request.setSuspendPolicy(
                EventRequest.SUSPEND_EVENT_THREAD
        );

        request.enable();
    }

    /*
     * Enables method-entry and method-exit tracing.
     *
     * IMPORTANT:
     * Do not exclude CodeVizRuntimeTrace here.
     *
     * JdiExecutionManager needs to detect loopEvent()
     * and branch() through MethodEntryEvent.
     */
    public static void enableMethodTracing(
            VirtualMachine vm,
            EventRequestManager manager
    ) {

        MethodEntryRequest entryRequest =
                manager.createMethodEntryRequest();

        MethodExitRequest exitRequest =
                manager.createMethodExitRequest();

        List<String> exclusions = List.of(
                "java.*",
                "javax.*",
                "jdk.*",
                "sun.*",
                "com.sun.*"
        );

        for (String exclusion : exclusions) {

            entryRequest.addClassExclusionFilter(exclusion);
            exitRequest.addClassExclusionFilter(exclusion);
        }

        entryRequest.setSuspendPolicy(
                EventRequest.SUSPEND_EVENT_THREAD
        );

        exitRequest.setSuspendPolicy(
                EventRequest.SUSPEND_EVENT_THREAD
        );

        entryRequest.enable();
        exitRequest.enable();
    }
}
