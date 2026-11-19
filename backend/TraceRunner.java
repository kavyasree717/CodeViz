
import java.nio.file.Paths;

public class TraceRunner {

    public static void main(String[] args) throws Exception {

        if (args.length < 3) {

            System.out.println(
                    JsonUtils.json(
                            JsonUtils.map(
                                    "output", "",
                                    "error",
                                    "Missing Java source information. Expected: targetDirectory, mainClass, sourcePath.",
                                    "events",
                                    java.util.Collections.emptyList()
                            )
                    )
            );

            return;
        }

        String targetDirectory = args[0];
        String mainClass = args[1];

        JdiExecutionManager.execute(
                targetDirectory,
                mainClass,
                Paths.get(args[2])
        );
    }
}
