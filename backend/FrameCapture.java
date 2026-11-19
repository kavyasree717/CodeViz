
import com.sun.jdi.*;

import java.util.*;

public final class FrameCapture {

    private FrameCapture() {
    }

    // Capture local variables and information about one frame.
    public static Map<String, Object> captureFrame(
            StackFrame frame,
            int depth
    ) {

        Map<String, Object> variables = new LinkedHashMap<>();
        Set<Long> visited = new HashSet<>();

        try {

            List<LocalVariable> localVariables =
                    frame.visibleVariables();

            Map<LocalVariable, Value> values =
                    frame.getValues(localVariables);

            for (LocalVariable variable : localVariables) {

                variables.put(
                        variable.name(),
                        RuntimeValueCapture.captureValue(
                                values.get(variable),
                                depth,
                                visited
                        )
                );
            }

        } catch (Exception ignored) {
        }

        Location location = frame.location();

        return JsonUtils.map(
                "method", location.method().name(),
                "class", location.declaringType().name(),
                "line", location.lineNumber(),
                "variables", variables
        );
    }

    // Capture multiple frames from the current thread.
    public static List<Object> captureStack(
            ThreadReference thread
    ) {

        List<Object> stack = new ArrayList<>();

        try {

            List<StackFrame> frames = thread.frames();

            int limit = Math.min(
                    frames.size(),
                    TraceConfig.MAX_STACK_FRAMES
            );

            for (int i = 0; i < limit; i++) {

                stack.add(
                        captureFrame(
                                frames.get(i),
                                i
                        )
                );
            }

        } catch (Exception ignored) {
        }

        return stack;
    }
}
