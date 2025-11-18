const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mcApi", {
  selectLevelDatFile: () => ipcRenderer.invoke("select-leveldat-file"),
  readLevelDat: (levelDatPath) =>
    ipcRenderer.invoke("read-leveldat", levelDatPath),
  writeLevelDat: (payload) => ipcRenderer.invoke("write-leveldat", payload),
});