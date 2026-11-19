import com.sun.source.tree.ClassTree;
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.ExpressionTree;
import com.sun.source.tree.ForLoopTree;
import com.sun.source.tree.IfTree;
import com.sun.source.tree.StatementTree;
import com.sun.source.tree.Tree;
import com.sun.source.tree.WhileLoopTree;
import com.sun.source.tree.DoWhileLoopTree;
import com.sun.source.util.JavacTask;
import com.sun.source.util.SourcePositions;
import com.sun.source.util.TreePathScanner;
import com.sun.source.util.Trees;

import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public final class SourceInstrumenter {

    private SourceInstrumenter() {
    }

    private static final class SourceEdit {

        final int position;
        final String text;

        SourceEdit(int position, String text) {
            this.position = position;
            this.text = text;
        }
    }

    private static String javaStringLiteral(String value) {

        StringBuilder result = new StringBuilder("\"");

        for (int i = 0; i < value.length(); i++) {

            char character = value.charAt(i);

            switch (character) {
                case '\\' -> result.append("\\\\");
                case '"' -> result.append("\\\"");
                case '\n' -> result.append("\\n");
                case '\r' -> result.append("\\r");
                case '\t' -> result.append("\\t");
                case '\b' -> result.append("\\b");
                case '\f' -> result.append("\\f");
                default -> result.append(character);
            }
        }

        return result.append('"').toString();
    }

    public static String formatDiagnostics(
            DiagnosticCollector<JavaFileObject> diagnostics
    ) {

        StringBuilder message = new StringBuilder();

        for (Diagnostic<? extends JavaFileObject> diagnostic
                : diagnostics.getDiagnostics()) {

            if (diagnostic.getKind() != Diagnostic.Kind.ERROR) {
                continue;
            }

            if (message.length() > 0) {
                message.append('\n');
            }

            String sourceName = diagnostic.getSource() == null
                    ? "Java source"
                    : Path.of(diagnostic.getSource().toUri())
                            .getFileName()
                            .toString();

            message.append(sourceName)
                    .append(':')
                    .append(diagnostic.getLineNumber())
                    .append(": ")
                    .append(diagnostic.getMessage(Locale.ROOT));
        }

        return message.length() == 0
                ? "Java compilation failed."
                : message.toString();
    }

    /*
     * Instruments an actual condition expression.
     *
     * Example:
     * while (i < 5)
     *
     * Becomes:
     * while (CodeVizRuntimeTrace.loop(
     *     (i < 5), line, "i < 5", "LOOP_1", "WHILE"))
     *
     * The condition is evaluated exactly once.
     */
    private static void addWrappedCondition(
            ExpressionTree condition,
            String loopType,
            String loopId,
            CompilationUnitTree unit,
            SourcePositions positions,
            String originalSource,
            List<SourceEdit> edits
    ) {

        long start = positions.getStartPosition(unit, condition);
        long end = positions.getEndPosition(unit, condition);

        if (start < 0
                || end < start
                || end > originalSource.length()) {
            return;
        }

        String expression = originalSource
                .substring((int) start, (int) end)
                .trim()
                .replaceAll("\\s+", " ");

        long line = unit.getLineMap().getLineNumber(start);

        String prefix =
                "(" + TraceConfig.TRACE_HELPER_NAME + ".loop((";

        String suffix =
                "), "
                        + line
                        + ", "
                        + javaStringLiteral(expression)
                        + ", "
                        + javaStringLiteral(loopId)
                        + ", "
                        + javaStringLiteral(loopType)
                        + "))";

        edits.add(new SourceEdit((int) start, prefix));
        edits.add(new SourceEdit((int) end, suffix));
    }

    /*
     * Handles for (;;) loops.
     *
     * There is no condition expression in an infinite for loop.
     * Therefore, we record an event at the beginning of each
     * body execution.
     *
     * Original:
     * for (;;) {
     *     work();
     * }
     *
     * Instrumented:
     * for (;;) {
     *     CodeVizRuntimeTrace.infiniteFor(...);
     *     work();
     * }
     */
    private static void instrumentInfiniteForLoop(
            ForLoopTree loop,
            String loopId,
            CompilationUnitTree unit,
            SourcePositions positions,
            List<SourceEdit> edits
    ) {

        StatementTree body = loop.getStatement();

        long bodyStart = positions.getStartPosition(unit, body);
        long loopStart = positions.getStartPosition(unit, loop);

        if (bodyStart < 0 || loopStart < 0) {
            return;
        }

        long line = unit.getLineMap().getLineNumber(loopStart);

        String callback =
                TraceConfig.TRACE_HELPER_NAME
                        + ".infiniteFor("
                        + line
                        + ", "
                        + javaStringLiteral(loopId)
                        + "); ";

        /*
         * Insert before the original body.
         *
         * This also works when the original body is a single
         * statement without braces because we wrap it in a block.
         */
        edits.add(new SourceEdit(
                (int) bodyStart,
                "{ " + callback
        ));

        long bodyEnd = positions.getEndPosition(unit, body);

        if (bodyEnd >= bodyStart) {
            edits.add(new SourceEdit(
                    (int) bodyEnd,
                    " }"
            ));
        }
    }

    public static String instrumentAndCompile(
            Path sourcePath,
            Path targetDirectory
    ) throws IOException {

        JavaCompiler compiler =
                ToolProvider.getSystemJavaCompiler();

        if (compiler == null) {

            return "A JDK compiler could not be found. "
                    + "Run CodeViz with a full JDK, not a JRE.";
        }

        String originalSource = Files.readString(
                sourcePath,
                StandardCharsets.UTF_8
        );

        DiagnosticCollector<JavaFileObject> parseDiagnostics =
                new DiagnosticCollector<>();

        String packageName = "";

        List<SourceEdit> edits = new ArrayList<>();

        int[] loopCounter = {0};

        try (StandardJavaFileManager fileManager =
                     compiler.getStandardFileManager(
                             parseDiagnostics,
                             Locale.ROOT,
                             StandardCharsets.UTF_8
                     )) {

            Iterable<? extends JavaFileObject> sourceFiles =
                    fileManager.getJavaFileObjects(
                            sourcePath.toFile()
                    );

            JavacTask parseTask = (JavacTask) compiler.getTask(
                    null,
                    fileManager,
                    parseDiagnostics,
                    List.of("-proc:none", "-encoding", "UTF-8"),
                    null,
                    sourceFiles
            );

            Iterable<? extends CompilationUnitTree> units =
                    parseTask.parse();

            Trees trees = Trees.instance(parseTask);

            SourcePositions positions =
                    trees.getSourcePositions();

            for (CompilationUnitTree unit : units) {

                if (unit.getPackageName() != null) {
                    packageName = unit.getPackageName().toString();
                }

                for (Tree declaration : unit.getTypeDecls()) {

                    if (declaration instanceof ClassTree classTree
                            && TraceConfig.TRACE_HELPER_NAME.equals(
                                    classTree.getSimpleName().toString()
                            )) {

                        return "Your Java file uses the reserved class name "
                                + TraceConfig.TRACE_HELPER_NAME
                                + ". Please rename that class and run again.";
                    }
                }

                final CompilationUnitTree currentUnit = unit;

                new TreePathScanner<Void, Void>() {

                    @Override
                    public Void visitIf(
                            IfTree ifTree,
                            Void unused
                    ) {

                        long start = positions.getStartPosition(
                                currentUnit,
                                ifTree.getCondition()
                        );

                        long end = positions.getEndPosition(
                                currentUnit,
                                ifTree.getCondition()
                        );

                        if (start >= 0
                                && end >= start
                                && end <= originalSource.length()) {

                            String expression = originalSource
                                    .substring((int) start, (int) end)
                                    .trim()
                                    .replaceAll("\\s+", " ");

                            long line = currentUnit.getLineMap()
                                    .getLineNumber(start);

                            String prefix =
                                    "(" + TraceConfig.TRACE_HELPER_NAME
                                            + ".branch((";

                            String suffix =
                                    "), "
                                            + line
                                            + ", "
                                            + javaStringLiteral(expression)
                                            + ", "
                                            + (ifTree.getElseStatement() != null)
                                            + "))";

                            edits.add(new SourceEdit(
                                    (int) start,
                                    prefix
                            ));

                            edits.add(new SourceEdit(
                                    (int) end,
                                    suffix
                            ));
                        }

                        return super.visitIf(ifTree, unused);
                    }

                    @Override
                    public Void visitForLoop(
                            ForLoopTree loop,
                            Void unused
                    ) {

                        String loopId =
                                "LOOP_" + (++loopCounter[0]);

                        if (loop.getCondition() != null) {

                            addWrappedCondition(
                                    loop.getCondition(),
                                    "FOR",
                                    loopId,
                                    currentUnit,
                                    positions,
                                    originalSource,
                                    edits
                            );

                        } else {

                            instrumentInfiniteForLoop(
                                    loop,
                                    loopId,
                                    currentUnit,
                                    positions,
                                    edits
                            );
                        }

                        return super.visitForLoop(loop, unused);
                    }

                    @Override
                    public Void visitWhileLoop(
                            WhileLoopTree loop,
                            Void unused
                    ) {

                        String loopId =
                                "LOOP_" + (++loopCounter[0]);

                        addWrappedCondition(
                                loop.getCondition(),
                                "WHILE",
                                loopId,
                                currentUnit,
                                positions,
                                originalSource,
                                edits
                        );

                        return super.visitWhileLoop(loop, unused);
                    }

                    @Override
                    public Void visitDoWhileLoop(
                            DoWhileLoopTree loop,
                            Void unused
                    ) {

                        String loopId =
                                "LOOP_" + (++loopCounter[0]);

                        addWrappedCondition(
                                loop.getCondition(),
                                "DO_WHILE",
                                loopId,
                                currentUnit,
                                positions,
                                originalSource,
                                edits
                        );

                        return super.visitDoWhileLoop(loop, unused);
                    }

                }.scan(unit, null);
            }

        } catch (Exception exception) {

            return "Could not inspect Java source: "
                    + exception.getMessage();
        }

        if (parseDiagnostics.getDiagnostics().stream().anyMatch(
                diagnostic ->
                        diagnostic.getKind() == Diagnostic.Kind.ERROR
        )) {

            return formatDiagnostics(parseDiagnostics);
        }

        // Apply edits from right to left.
        edits.sort(
                Comparator.comparingInt(
                        (SourceEdit edit) -> edit.position
                ).reversed()
        );

        StringBuilder modified =
                new StringBuilder(originalSource);

        for (SourceEdit edit : edits) {
            modified.insert(edit.position, edit.text);
        }

        String instrumentedSource = modified.toString();

        Files.createDirectories(targetDirectory);

        Path temporaryDirectory =
                Files.createTempDirectory("codeviz-instrumented-");

        try {

            Path temporarySource = temporaryDirectory.resolve(
                    sourcePath.getFileName()
            );

            Path helperPath = temporaryDirectory.resolve(
                    TraceConfig.TRACE_HELPER_NAME + ".java"
            );

            Files.writeString(
                    temporarySource,
                    instrumentedSource,
                    StandardCharsets.UTF_8
            );

            Files.writeString(
                    helperPath,
                    TraceHelperGenerator.buildTraceHelperSource(packageName),
                    StandardCharsets.UTF_8
            );

            DiagnosticCollector<JavaFileObject> compileDiagnostics =
                    new DiagnosticCollector<>();

            try (StandardJavaFileManager fileManager =
                         compiler.getStandardFileManager(
                                 compileDiagnostics,
                                 Locale.ROOT,
                                 StandardCharsets.UTF_8
                         )) {

                Iterable<? extends JavaFileObject> compileFiles =
                        fileManager.getJavaFileObjects(
                                temporarySource.toFile(),
                                helperPath.toFile()
                        );

                List<String> options = List.of(
                        "-g",
                        "-encoding",
                        "UTF-8",
                        "-d",
                        targetDirectory.toString()
                );

                Boolean compiled = compiler.getTask(
                        null,
                        fileManager,
                        compileDiagnostics,
                        options,
                        null,
                        compileFiles
                ).call();

                if (!Boolean.TRUE.equals(compiled)) {
                    return formatDiagnostics(compileDiagnostics);
                }
            }

        } finally {

            try (var paths = Files.walk(temporaryDirectory)) {

                paths.sorted(Comparator.reverseOrder())
                        .forEach(path -> {
                            try {
                                Files.deleteIfExists(path);
                            } catch (IOException ignored) {
                            }
                        });
            }
        }

        return null;
    }
}