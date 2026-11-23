import { build } from "esbuild";
import { copyFile } from "node:fs/promises";
await build({
  entryPoints: ["web/main.ts"],
  bundle: true,
  format: "esm",
  outfile: "public/app.js",
  sourcemap: false,
});
for (const name of ["base", "brown", "cburnett"])
  await copyFile(
    `node_modules/@lichess-org/chessground/assets/chessground.${name}.css`,
    `public/chessground.${name}.css`,
  );

// Private game entry is independent of the homepage's evolving DOM/bundle.
await build({entryPoints:["web/alpha.ts"],bundle:true,format:"esm",outfile:"public/alpha.js",sourcemap:false});
