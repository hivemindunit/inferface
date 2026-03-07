import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/lib/utils.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "react-markdown", "remark-gfm", "shiki"],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    };
  },
});
