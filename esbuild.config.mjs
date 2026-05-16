import esbuild from "esbuild";
import builtins from "builtin-modules";
import { access, copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const production = args.has("production");
const watch = process.argv.includes("--watch");
const rootDir = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(rootDir, "dist");
const staticArtifacts = ["manifest.json", "styles.css", "versions.json"];

async function copyStaticArtifacts() {
  await mkdir(distDir, { recursive: true });

  await Promise.all(
    staticArtifacts.map(async (fileName) => {
      const sourcePath = resolve(rootDir, fileName);
      try {
        await access(sourcePath);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          return;
        }
        throw error;
      }

      await copyFile(sourcePath, resolve(distDir, fileName));
    })
  );
}

const copyStaticArtifactsPlugin = {
  name: "copy-static-artifacts",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;
      await copyStaticArtifacts();
    });
  }
};

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
  entryPoints: {
    main: "src/main.ts",
    "desktop-pet-preload": "src/desktop-pet-preload.ts"
  },
  bundle: true,
  external,
  entryNames: "[name]",
  format: "cjs",
  loader: {
    ".webp": "dataurl"
  },
  target: "es2018",
  logLevel: "info",
  minify: production,
  plugins: [copyStaticArtifactsPlugin],
  sourcemap: production ? false : "inline",
  treeShaking: true,
  outdir: distDir
});

if (watch) {
  await context.watch();
  console.log("Watching for changes in dist/...");
} else {
  await context.rebuild();
  await context.dispose();
}
