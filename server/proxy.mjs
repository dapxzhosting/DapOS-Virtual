import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const port = Number(process.env.PORT ?? 8787);
const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function sendText(response, status, message) {
  response.writeHead(status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
  response.end(message);
}

async function findFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^[/\\]+/, "");
  const file = resolve(root, relative);
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    const info = await stat(file);
    if (info.isFile()) return file;
    if (info.isDirectory()) {
      const index = resolve(file, "index.html");
      await access(index);
      return index;
    }
  } catch {
    return null;
  }
  return null;
}

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  } catch {
    sendText(response, 400, "Invalid request URL");
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed");
    return;
  }

  if (pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === "/proxy/health" || pathname === "/proxy") {
    response.writeHead(503, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: false, error: "The external browsing proxy is not configured on this deployment." }));
    return;
  }

  try {
    await access(root);
  } catch {
    sendText(response, 503, "Production files are missing. Run npm run build before starting the server.");
    return;
  }

  const file = await findFile(pathname);
  const target = file ?? resolve(root, "index.html");
  try {
    const info = await stat(target);
    response.writeHead(200, {
      "content-type": mimeTypes[extname(target).toLowerCase()] ?? "application/octet-stream",
      "content-length": info.size,
      "cache-control": file && pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
      "x-content-type-options": "nosniff",
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(target).pipe(response);
  } catch {
    sendText(response, 500, "Unable to serve the requested page.");
  }
});

server.listen(port, "0.0.0.0");
