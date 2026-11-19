
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

public final class JsonUtils {

    private JsonUtils() {
    }

    public static String quote(String value) {
        return "\"" + value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t") + "\"";
    }

    public static String json(Object value) {

        if (value == null) {
            return "null";
        }

        if (value instanceof String) {
            return quote((String) value);
        }

        if (value instanceof Number || value instanceof Boolean) {
            return value.toString();
        }

        if (value instanceof Map<?, ?> map) {

            StringBuilder result = new StringBuilder("{");
            boolean first = true;

            for (Map.Entry<?, ?> entry : map.entrySet()) {

                if (!first) {
                    result.append(",");
                }

                first = false;

                result.append(quote(String.valueOf(entry.getKey())))
                        .append(":")
                        .append(json(entry.getValue()));
            }

            return result.append("}").toString();
        }

        if (value instanceof Collection<?> collection) {

            StringBuilder result = new StringBuilder("[");
            boolean first = true;

            for (Object item : collection) {

                if (!first) {
                    result.append(",");
                }

                first = false;
                result.append(json(item));
            }

            return result.append("]").toString();
        }

        return quote(value.toString());
    }

    public static Map<String, Object> map(Object... values) {

        Map<String, Object> result = new LinkedHashMap<>();

        for (int i = 0; i < values.length; i += 2) {
            result.put((String) values[i], values[i + 1]);
        }

        return result;
    }
}
