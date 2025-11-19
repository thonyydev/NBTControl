const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mcApi", {
  selectLevelDatFile: () => ipcRenderer.invoke("select-leveldat-file"),
  readLevelDat: (levelDatPath) =>
    ipcRenderer.invoke("read-leveldat", levelDatPath),
  writeLevelDat: (payload) => ipcRenderer.invoke("write-leveldat", payload),
});

contextBridge.exposeInMainWorld("windowControls", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  toggleMaximize: () => ipcRenderer.invoke("window:toggle-maximize"),
  close: () => ipcRenderer.invoke("window:close"),
});