
import com.sun.jdi.*;

import java.util.*;

public final class RuntimeValueCapture {

    private RuntimeValueCapture() {
    }

    public static Object captureValue(
            Value value,
            int depth,
            Set<Long> visited
    ) {

        if (value == null) {
            return JsonUtils.map(
                    "kind", "null",
                    "value", null
            );
        }

        // Primitive values: int, boolean, double, etc.
        if (value instanceof PrimitiveValue) {

            return JsonUtils.map(
                    "kind", "primitive",
                    "type", value.type().name(),
                    "value", value.toString()
            );
        }

        // String values
        if (value instanceof StringReference string) {

            return JsonUtils.map(
                    "kind", "string",
                    "type", "String",
                    "value", string.value()
            );
        }

        // Array values
        if (value instanceof ArrayReference array) {

            List<Object> elements = new ArrayList<>();
            List<Value> values = array.getValues();

            int limit = Math.min(
                    values.size(),
                    TraceConfig.MAX_ARRAY_ITEMS
            );

            for (int i = 0; i < limit; i++) {

                elements.add(
                        captureValue(
                                values.get(i),
                                depth + 1,
                                visited
                        )
                );
            }

            return JsonUtils.map(
                    "kind", "array",
                    "type", array.referenceType().name(),
                    "length", array.length(),
                    "elements", elements
            );
        }

        // Object values
        if (value instanceof ObjectReference object) {

            long id = object.uniqueID();

            // Prevent circular references
            if (visited.contains(id)) {

                return JsonUtils.map(
                        "kind", "reference",
                        "type", object.referenceType().name(),
                        "id", id
                );
            }

            // Prevent excessively deep object capture
            if (depth >= TraceConfig.MAX_OBJECT_DEPTH) {

                return JsonUtils.map(
                        "kind", "object",
                        "type", object.referenceType().name(),
                        "id", id,
                        "truncated", true
                );
            }

            visited.add(id);

            Map<String, Object> fields = new LinkedHashMap<>();

            try {

                List<Field> instanceFields = new ArrayList<>();

                // Collect non-static fields
                for (Field field : object.referenceType().allFields()) {

                    if (!field.isStatic()) {
                        instanceFields.add(field);
                    }
                }

                int limit = Math.min(
                        instanceFields.size(),
                        TraceConfig.MAX_OBJECT_FIELDS
                );

                List<Field> selected =
                        instanceFields.subList(0, limit);

                Map<Field, Value> fieldValues =
                        object.getValues(selected);

                // Capture every selected field
                for (Field field : selected) {

                    fields.put(
                            field.name(),
                            captureValue(
                                    fieldValues.get(field),
                                    depth + 1,
                                    visited
                            )
                    );
                }

            } catch (Exception ignored) {
            }

            return JsonUtils.map(
                    "kind", "object",
                    "type", object.referenceType().name(),
                    "id", id,
                    "fields", fields
            );
        }

        // Unknown value type
        return JsonUtils.map(
                "kind", "unknown",
                "type", value.type().name(),
                "value", value.toString()
        );
    }
}
