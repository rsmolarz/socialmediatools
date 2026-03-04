import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/app.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    banner: {
      js: [
        'import { createRequire } from "module";',
        'const require = createRequire(import.meta.url);',
        'import { fileURLToPath as __esm_fileURLToPath } from "url";',
        'import { dirname as __esm_dirname } from "path";',
        'const __filename = __esm_fileURLToPath(import.meta.url);',
        'const __dirname = __esm_dirname(__filename);',
      ].join("\n"),
    },
    minify: true,
    external: allDeps,
    logLevel: "info",
  });

  await esbuild({
    entryPoints: ["server/startup.ts"],
    platform: "node",
    bundle: false,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
