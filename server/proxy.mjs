import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { lookup } from "node:dns/promises";
import { isIP, BlockList } from "node:net";
import { createServer } from "node:http";
import https from "node:https";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)));
const port = Number(process.env.PORT ?? 8787);
const MAX_PROXY_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 512;
const MAX_PROXY_REDIRECTS = 5;
const MAX_PROXY_URL_LENGTH = 4096;
const RATE_LIMIT = 900;
const RATE_WINDOW = 60_000;
const DNS_CACHE_TTL = 60_000;
const ASSET_CACHE_TTL = 10 * 60_000;
const allowedDomains = [
  "wikipedia.org",
  "wikimedia.org",
  "wikimediafoundation.org",
  "mozilla.org",
  "github.com",
  "githubusercontent.com",
  "githubassets.com",
  "duckduckgo.com",
  "bing.com",
  "ycombinator.com",
];
const blockedAddresses = new BlockList();
for (const subnet of [
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.0.0.0", 24, "ipv4"],
  ["192.0.2.0", 24, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["198.18.0.0", 15, "ipv4"],
  ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"],
  ["224.0.0.0", 4, "ipv4"],
  ["240.0.0.0", 4, "ipv4"],
  ["::", 128, "ipv6"],
  ["::1", 128, "ipv6"],
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
  ["ff00::", 8, "ipv6"],
  ["2001:db8::", 32, "ipv6"],
]) {
  blockedAddresses.addSubnet(subnet[0], subnet[1], subnet[2]);
}
const requestCounts = new Map();
const dnsCache = new Map();
const assetCache = new Map();
const pendingAssets = new Map();
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 64, maxFreeSockets: 16, timeout: 15_000 });
let assetCacheBytes = 0;
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

function allowedHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isPublicAddress(address) {
  const family = isIP(address);
  if (!family) return false;
  if (family === 4) return !blockedAddresses.check(address, "ipv4");
  if (address.toLowerCase().startsWith("::ffff:")) {
    const mapped = address.slice(address.lastIndexOf(":") + 1);
    return isIP(mapped) === 4 && !blockedAddresses.check(mapped, "ipv4");
  }
  return !blockedAddresses.check(address, "ipv6");
}

function proxyPath(url) {
  return `/proxy?url=${encodeURIComponent(url)}`;
}

function rewriteCss(css, baseUrl) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (whole, quote, value) => {
    const trimmed = value.trim();
    if (!trimmed || /^(data:|blob:|#|javascript:)/i.test(trimmed)) return whole;
    try {
      return `url("${proxyPath(new URL(trimmed, baseUrl).href)}")`;
    } catch {
      return whole;
    }
  }).replace(/@import\s+(["'])(.*?)\1/gi, (whole, quote, value) => {
    try {
      return `@import "${proxyPath(new URL(value, baseUrl).href)}"`;
    } catch {
      return whole;
    }
  });
}

function rewriteHtml(html, baseUrl) {
  const withoutBase = html.replace(/<base\b[^>]*>/gi, "");
  const rewritten = withoutBase.replace(/\b(href|src|action|poster|data-src)\s*=\s*(["'])(.*?)\2/gi, (whole, attribute, quote, value) => {
    const trimmed = value.trim();
    if (!trimmed || /^(data:|blob:|#|javascript:|mailto:|tel:)/i.test(trimmed)) return whole;
    try {
      const target = new URL(trimmed, baseUrl);
      if (target.protocol !== "http:" && target.protocol !== "https:") return whole;
      return `${attribute}=${quote}${proxyPath(target.href)}${quote}`;
    } catch {
      return whole;
    }
  });
  return rewritten.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) =>
    `<style${attrs}>${rewriteCss(css, baseUrl)}</style>`
  ).replace(/\sstyle=(["'])(.*?)\1/gi, (whole, quote, css) =>
    ` style=${quote}${rewriteCss(css, baseUrl)}${quote}`
  );
}

function takeRateLimit(request, response) {
  const ip = request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  if (requestCounts.size > 10_000) {
    for (const [key, entry] of requestCounts) {
      if (now - entry.startedAt >= RATE_WINDOW) requestCounts.delete(key);
    }
  }
  const current = requestCounts.get(ip);
  if (!current || now - current.startedAt >= RATE_WINDOW) {
    requestCounts.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count++;
  if (current.count <= RATE_LIMIT) return true;
  sendText(response, 429, "Proxy request limit reached. Try again in a minute.");
  return false;
}

async function validateTarget(target) {
  if (target.protocol !== "https:" || target.username || target.password) {
    throw new Error("Only public HTTPS websites are supported.");
  }
  if (target.port && target.port !== "443") {
    throw new Error("Non-standard ports are not allowed.");
  }
  if (!allowedHost(target.hostname)) {
    throw new Error("This domain is not on the DapOS browser allowlist. Open it in your regular browser instead.");
  }
  const host = target.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) throw new Error("IP address URLs are not allowed.");
  const cached = dnsCache.get(host);
  let addresses = cached && cached.expiresAt > Date.now() ? cached.addresses : null;
  if (!addresses) {
    addresses = await lookup(host, { all: true, verbatim: true });
    if (dnsCache.size >= MAX_CACHE_ENTRIES) dnsCache.delete(dnsCache.keys().next().value);
    dnsCache.set(host, { addresses, expiresAt: Date.now() + DNS_CACHE_TTL });
  }
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("The destination resolved to a non-public network address.");
  }
  return addresses[0];
}

function fetchTarget(target, address) {
  return new Promise((resolveResponse, reject) => {
    const family = isIP(address.address);
    const request = https.get(target, {
      agent: httpsAgent,
      headers: {
        "accept": "text/html, text/css, application/javascript, application/json, image/*, font/*, */*;q=0.5",
        "accept-encoding": "identity",
        "user-agent": "Mozilla/5.0 (compatible; DapOSBrowser/1.0)",
      },
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [{ address: address.address, family }]);
        else callback(null, address.address, family);
      },
      servername: target.hostname,
      timeout: 12_000,
    }, (upstream) => resolveResponse({ request, upstream }));
    request.on("timeout", () => request.destroy(new Error("The destination timed out.")));
    request.on("error", reject);
  });
}

async function fetchProxyResponse(target, redirects = 0) {
  const address = await validateTarget(target);
  const { request, upstream } = await fetchTarget(target, address);
  const status = upstream.statusCode ?? 502;
  if ([301, 302, 303, 307, 308].includes(status) && upstream.headers.location) {
    upstream.resume();
    if (redirects >= MAX_PROXY_REDIRECTS) {
      request.destroy();
      throw new Error("The destination redirected too many times.");
    }
    return fetchProxyResponse(new URL(upstream.headers.location, target), redirects + 1);
  }
  const contentType = upstream.headers["content-type"] ?? "application/octet-stream";
  const mime = contentType.split(";")[0].trim().toLowerCase();
  const allowedMime = /^(text\/(html|css|plain|javascript)|application\/(xhtml\+xml|javascript|x-javascript|json|xml|wasm)|image\/|font\/|application\/(font|vnd\.ms-fontobject)|audio\/|video\/)/;
  if (status < 200 || status >= 300 || !allowedMime.test(mime)) {
    upstream.resume();
    request.destroy();
    throw new Error(`The destination returned an unsupported response (${status}, ${mime}).`);
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of upstream) {
    total += chunk.length;
    if (total > MAX_PROXY_BYTES) {
      request.destroy();
      throw new Error("The response is larger than the 8 MB limit.");
    }
    chunks.push(chunk);
  }
  let body = Buffer.concat(chunks);
  if (mime === "text/html" || mime === "application/xhtml+xml") {
    body = Buffer.from(rewriteHtml(body.toString("utf8"), target.href));
  } else if (mime === "text/css") {
    body = Buffer.from(rewriteCss(body.toString("utf8"), target.href));
  }
  return { status, contentType, body };
}

function isCacheableAsset(target) {
  return /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|gif|webp|avif|svg|ico)(?:$|[?#])/i.test(target.pathname);
}

function cacheAsset(key, result) {
  if (result.status < 200 || result.status >= 300 || result.body.length > MAX_CACHE_BYTES) return;
  const previous = assetCache.get(key);
  if (previous) assetCacheBytes -= previous.result.body.length;
  while ((assetCacheBytes + result.body.length > MAX_CACHE_BYTES || assetCache.size >= MAX_CACHE_ENTRIES) && assetCache.size) {
    const oldestKey = assetCache.keys().next().value;
    if (oldestKey === undefined) break;
    const oldest = assetCache.get(oldestKey);
    if (oldest) assetCacheBytes -= oldest.result.body.length;
    assetCache.delete(oldestKey);
  }
  assetCache.set(key, { result, expiresAt: Date.now() + ASSET_CACHE_TTL });
  assetCacheBytes += result.body.length;
}

async function proxyRequest(target) {
  if (!isCacheableAsset(target)) return fetchProxyResponse(target);
  const key = target.href;
  const cached = assetCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) {
    assetCache.delete(key);
    assetCacheBytes -= cached.result.body.length;
  }
  const pending = pendingAssets.get(key);
  if (pending) return pending;
  const request = fetchProxyResponse(target).then((result) => {
    cacheAsset(key, result);
    return result;
  }).finally(() => pendingAssets.delete(key));
  pendingAssets.set(key, request);
  return request;
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

  if (pathname === "/proxy/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true, mode: "allowlist" }));
    return;
  }

  if (pathname === "/proxy") {
    if (!takeRateLimit(request, response)) return;
    const query = new URL(request.url ?? "/", "http://localhost").searchParams;
    const raw = query.get("url");
    if (!raw || raw.length > MAX_PROXY_URL_LENGTH) {
      sendText(response, 400, "A valid URL is required (maximum 4096 characters).");
      return;
    }
    let target;
    try {
      target = new URL(raw);
      const result = await proxyRequest(target);
      response.writeHead(result.status, {
        "content-type": result.contentType,
        "content-length": result.body.length,
        "cache-control": "private, max-age=60",
        "content-security-policy": "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' data: blob:; form-action 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'",
        "x-content-type-options": "nosniff",
        "access-control-allow-origin": "*",
      });
      response.end(request.method === "HEAD" ? undefined : result.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The destination request failed.";
      const forbidden = ["allowlist", "non-public", "not allowed", "Only public HTTPS", "Non-standard ports", "IP address URLs"]
        .some((phrase) => message.includes(phrase));
      const status = forbidden ? 403 : 502;
      sendText(response, status, message);
    }
    return;
  }

  if (pathname === "/health") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify({ ok: true }));
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
