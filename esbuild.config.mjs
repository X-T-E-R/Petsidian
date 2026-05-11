import esbuild from "esbuild";
import builtins from "builtin-modules";

const production = process.argv[2] === "production";
const watch = process.argv.includes("--watch");

const external = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
  ...builtins,
  ...builtins.map((moduleName) => `node:${moduleName}`)
];

const context = await esbuild.context({
  banner: {
    js: "/* Petsidian - Obsidian native plugin */"
  },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external,
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  minify: production,
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outfile: "main.js"
});

if (watch) {
  await context.watch();
  console.log("Watching for changes...");
} else {
  await context.rebuild();
  await context.dispose();
}
