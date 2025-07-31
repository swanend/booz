import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts", "./scripts/copy-templates.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  target: "node18",
  esbuildOptions(options) {
    options.platform = "node";
    options.mainFields = ["module", "main"]; // Prefer ESM entry
  },
});
