import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const assets = path.join(root, "design/logo-explorations/final");
const nativeIndex = process.argv.indexOf("--native-dir");
const native = nativeIndex < 0 ? undefined : process.argv[nativeIndex + 1];
if (nativeIndex >= 0 && !native)
  throw new Error("--native-dir requires a Lila directory");
const destinations = [
  assets,
  ...(native ? [path.join(native, "public/nosweat")] : []),
];

const icon = await readFile(path.join(assets, "icon.svg"), "utf8");
const appIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#101719"/><svg x="12" y="12" width="96" height="96">${icon.replace(/<svg[^>]*>|<\/svg>/g, "")}</svg></svg>`;
const outputs = new Map([
  [
    "favicon-32.png",
    await sharp(path.join(assets, "icon-light.svg"))
      .resize(32, 32)
      .png()
      .toBuffer(),
  ],
  [
    "app-icon-192.png",
    await sharp(Buffer.from(appIcon)).resize(192, 192).png().toBuffer(),
  ],
  [
    "app-icon-512.png",
    await sharp(Buffer.from(appIcon)).resize(512, 512).png().toBuffer(),
  ],
  [
    "social.png",
    await sharp(path.join(assets, "social.svg"))
      .resize(1200, 630)
      .png()
      .toBuffer(),
  ],
]);
for (const destination of destinations)
  for (const [filename, bytes] of outputs)
    await writeFile(path.join(destination, filename), bytes);
const manifest = {
  name: "MuteChess",
  short_name: "MuteChess",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#101719",
  theme_color: "#101719",
  description:
    "Free, open-source chess with human-like Maia opponents. Stay human. Play bots.",
  icons: [192, 512].map((size) => ({
    src: `/assets/nosweat/app-icon-${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: "any",
  })),
};
for (const destination of destinations)
  await writeFile(
    path.join(destination, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
console.log(
  `Rendered ${outputs.size} PNG assets and the manifest in ${destinations.length} destination(s)`,
);
