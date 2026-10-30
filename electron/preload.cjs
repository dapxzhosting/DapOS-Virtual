const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dapos", {
  openSite: (url) => ipcRenderer.invoke("dapos:open-site", url),
});
