/** Static desktop mockup only: no database, identity, inference, or live game service. */
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../public/", import.meta.url));
const port = Number(process.env.PREVIEW_PORT || 4173);
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (url.pathname.startsWith("/api/")) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Static preview: game service is not running." }),
    );
    return;
  }
  const file = path.resolve(
    root,
    "." +
      decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
  );
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type":
        (types[path.extname(file)] || "application/octet-stream") +
        ([".html", ".css", ".js"].includes(path.extname(file))
          ? "; charset=utf-8"
          : ""),
    });
    res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`nosweatchess desktop preview: http://127.0.0.1:${port}`),
);
process.once("SIGINT", () => server.close());
process.once("SIGTERM", () => server.close());
