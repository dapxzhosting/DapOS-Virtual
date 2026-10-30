const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");

const browserPartition = "persist:dapos-browser";
const appWindowPreload = path.join(__dirname, "preload.cjs");
let appWindow;
let siteWindow;

function isWebUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

function browserPreferences() {
  return {
    partition: browserPartition,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  };
}

function createSiteWindow(url) {
  if (!isWebUrl(url)) throw new Error("Hanya alamat HTTP atau HTTPS yang bisa dibuka.");

  if (siteWindow && !siteWindow.isDestroyed()) {
    siteWindow.focus();
    return siteWindow.loadURL(url);
  }

  siteWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    title: "Browser DapOS",
    show: false,
    webPreferences: browserPreferences(),
  });

  siteWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (!isWebUrl(targetUrl)) return { action: "deny" };
    return {
      action: "allow",
      overrideBrowserWindowOptions: { webPreferences: browserPreferences() },
    };
  });

  siteWindow.webContents.on("will-navigate", (event, targetUrl) => {
    if (!isWebUrl(targetUrl)) event.preventDefault();
  });

  siteWindow.once("ready-to-show", () => siteWindow?.show());
  siteWindow.on("closed", () => {
    siteWindow = undefined;
  });
  return siteWindow.loadURL(url);
}

function createAppWindow() {
  appWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    title: "DapOS",
    webPreferences: {
      preload: appWindowPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  appWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  appWindow.webContents.on("will-navigate", (event, targetUrl) => {
    const devUrl = process.env.DAPOS_VITE_DEV_SERVER_URL;
    if (devUrl && targetUrl.startsWith(devUrl)) return;
    if (targetUrl.startsWith("file://")) return;
    event.preventDefault();
  });

  const devUrl = process.env.DAPOS_VITE_DEV_SERVER_URL;
  if (devUrl) {
    void appWindow.loadURL(devUrl);
  } else {
    void appWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("dapos:open-site", (event, url) => {
  if (!appWindow || event.sender !== appWindow.webContents) {
    throw new Error("Permintaan membuka situs tidak berasal dari jendela DapOS.");
  }
  return createSiteWindow(url);
});

app.whenReady().then(() => {
  app.setAppUserModelId("com.dapos.webos");
  createAppWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createAppWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
