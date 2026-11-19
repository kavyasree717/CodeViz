
import com.sun.source.tree.CompilationUnitTree;
import com.sun.source.tree.DoWhileLoopTree;
import com.sun.source.tree.ForLoopTree;
import com.sun.source.tree.WhileLoopTree;
import com.sun.source.util.SourcePositions;
import com.sun.source.util.TreePathScanner;

import java.util.ArrayList;
import java.util.List;

/**
 * Finds Java loop conditions and wraps them with a runtime trace call.
 *
 * The wrapper returns the original boolean value, so the loop's
 * condition is evaluated exactly once and its behavior is preserved.
 */
public final class LoopInstrumenter {

    private LoopInstrumenter() {
    }

    public static final class Edit {
        public final int position;
        public final String text;

        public Edit(int position, String text) {
            this.position = position;
            this.text = text;
        }
    }

    public static List<Edit> collectEdits(
            CompilationUnitTree unit,
            SourcePositions positions,
            String originalSource
    ) {
        List<Edit> edits = new ArrayList<>();

        new TreePathScanner<Void, Void>() {

            private void instrumentCondition(
                    com.sun.source.tree.ExpressionTree condition,
                    String loopType
            ) {
                if (condition == null) {
                    // Example: for (;;) has no condition expression.
                    return;
                }

                long start = positions.getStartPosition(unit, condition);
                long end = positions.getEndPosition(unit, condition);

                if (start < 0 || end < start
                        || end > originalSource.length()) {
                    return;
                }

                String expression = originalSource
                        .substring((int) start, (int) end)
                        .trim()
                        .replaceAll("\\s+", " ");

                long line = unit.getLineMap().getLineNumber(start);

                String prefix =
                        "(CodeVizRuntimeTrace.loopCondition((";

                String suffix =
                        "), "
                        + line
                        + ", "
                        + javaStringLiteral(expression)
                        + ", "
                        + javaStringLiteral(loopType)
                        + "))";

                edits.add(new Edit((int) start, prefix));
                edits.add(new Edit((int) end, suffix));
            }

            @Override
            public Void visitWhileLoop(
                    WhileLoopTree tree,
                    Void unused
            ) {
                instrumentCondition(tree.getCondition(), "WHILE");
                return super.visitWhileLoop(tree, unused);
            }

            @Override
            public Void visitForLoop(
                    ForLoopTree tree,
                    Void unused
            ) {
                instrumentCondition(tree.getCondition(), "FOR");
                return super.visitForLoop(tree, unused);
            }

            @Override
            public Void visitDoWhileLoop(
                    DoWhileLoopTree tree,
                    Void unused
            ) {
                instrumentCondition(tree.getCondition(), "DO_WHILE");
                return super.visitDoWhileLoop(tree, unused);
            }

        }.scan(unit, null);

        return edits;
    }

    private static String javaStringLiteral(String value) {
        StringBuilder result = new StringBuilder("\"");

        for (int i = 0; i < value.length(); i++) {
            char character = value.charAt(i);

            switch (character) {
                case '\\':
                    result.append("\\\\");
                    break;
                case '"':
                    result.append("\\\"");
                    break;
                case '\n':
                    result.append("\\n");
                    break;
                case '\r':
                    result.append("\\r");
                    break;
                case '\t':
                    result.append("\\t");
                    break;
                case '\b':
                    result.append("\\b");
                    break;
                case '\f':
                    result.append("\\f");
                    break;
                default:
                    result.append(character);
            }
        }

        return result.append('"').toString();
    }
}

