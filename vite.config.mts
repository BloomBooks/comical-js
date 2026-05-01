import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
    const isMinifiedBuild = mode === "minified";

    return {
        build: {
            lib: {
                entry: resolve(__dirname, "src/index.ts"),
                name: "ComicalJS",
                formats: isMinifiedBuild ? ["umd"] : ["es", "cjs", "umd"],
                fileName: format => {
                    if (isMinifiedBuild) {
                        return "index.min.js";
                    }

                    switch (format) {
                        case "es":
                            return "index.mjs";
                        case "cjs":
                            return "index.js";
                        default:
                            return "index.umd.js";
                    }
                }
            },
            minify: isMinifiedBuild ? "esbuild" : false,
            sourcemap: true,
            target: "es2015",
            rollupOptions: {
                output: {
                    exports: "named"
                }
            }
        }
    };
});