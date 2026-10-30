import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devUrl = "http://127.0.0.1:5173";
const vite = await createServer({
  configFile: path.join(root, "vite.config.ts"),
  root,
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
});

await vite.listen();

const electronCli = path.join(root, "node_modules", "electron", "cli.js");
const electronProcess = spawn(process.execPath, [electronCli, root], {
  cwd: root,
  env: { ...process.env, DAPOS_VITE_DEV_SERVER_URL: devUrl },
  stdio: "inherit",
});

let viteClosed = false;
const closeVite = async () => {
  if (viteClosed) return;
  viteClosed = true;
  await vite.close();
};

const shutdown = async (signal) => {
  if (electronProcess.exitCode === null) electronProcess.kill(signal);
  await closeVite();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

electronProcess.once("error", async (error) => {
  await closeVite();
  console.error("Gagal menjalankan Electron:", error);
  process.exitCode = 1;
});

electronProcess.once("close", async (code) => {
  await closeVite();
  process.exitCode = code ?? 1;
});
