
public final class TraceConfig {

    private TraceConfig() {
    }

    public static final int MAX_STEPS = 1000;
    public static final int MAX_ARRAY_ITEMS = 50;
    public static final int MAX_OBJECT_FIELDS = 40;
    public static final int MAX_OBJECT_DEPTH = 3;
    public static final int MAX_STACK_FRAMES = 12;

    public static final String TRACE_HELPER_NAME =
            "CodeVizRuntimeTrace";
}
