// main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const zlib = require("zlib");
const nbt = require("prismarine-nbt");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    backgroundColor: "#060712",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function parseNbtAsync(buffer) {
  return new Promise((resolve, reject) => {
    nbt.parse(buffer, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

ipcMain.handle("select-leveldat-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Minecraft level.dat", extensions: ["dat"] },
      { name: "Todos os arquivos", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  return result.filePaths[0]; // caminho completo do level.dat
});

// ler level.dat (recebe o caminho do arquivo)
ipcMain.handle("read-leveldat", async (event, levelDatPath) => {
  try {
    const raw = fs.readFileSync(levelDatPath);
    const decompressed = zlib.gunzipSync(raw);

    const nbtData = await parseNbtAsync(decompressed);
    return nbtData.value; // root.value
  } catch (err) {
    console.error(err);
    throw new Error("Erro ao ler o level.dat");
  }
});

// salvar level.dat com alterações (com backup automático)
ipcMain.handle("write-leveldat", async (event, { levelDatPath, newData }) => {
  try {
    // backup automático no mesmo diretório do level.dat
    if (fs.existsSync(levelDatPath)) {
      const original = fs.readFileSync(levelDatPath);
      const dir = path.dirname(levelDatPath);
      const backupName = `level_backup_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.dat`;
      const backupPath = path.join(dir, backupName);
      fs.writeFileSync(backupPath, original);
      console.log("Backup criado em:", backupPath);
    }

    const nbtRoot = {
      name: "",
      type: "compound",
      value: newData,
    };

    const buffer = nbt.writeUncompressed(nbtRoot);
    const compressed = zlib.gzipSync(buffer);
    fs.writeFileSync(levelDatPath, compressed);

    return true;
  } catch (err) {
    console.error(err);
    throw new Error("Erro ao salvar o level.dat");
  }
});

ipcMain.handle("window:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("window:toggle-maximize", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle("window:close", () => {
  if (mainWindow) mainWindow.close();
});
