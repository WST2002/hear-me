// Palak main process: one window, the SmartSpectra IPC bridge, camera-only permission for our own page,
// and the API key read from .env (never bundled into the renderer).
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { app, BrowserWindow, ipcMain, session } = require("electron");
const { bindSmartSpectraIpc } = require("@smartspectra/node-sdk/main");

function readApiKey() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return "";
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("SMARTSPECTRA_API_KEY="));
  return line ? line.slice(line.indexOf("=") + 1).trim() : "";
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: "#0f1115",
    title: "Palak",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: false, nodeIntegration: false },
  });
  bindSmartSpectraIpc(win);
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event) => event.preventDefault());
  win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  // Camera only (no microphone), and only for the bundled local page.
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = details?.requestingUrl || wc?.getURL() || "";
    const types = details?.mediaTypes || [];
    callback(permission === "media" && types.length === 1 && types[0] === "video" && url.startsWith("file://"));
  });
  ipcMain.handle("palak:api-key", () => readApiKey());
  // `npm start -- --replay=clip.mp4` feeds a recorded clip instead of the camera (testing and demos).
  const replay = process.argv.find((a) => a.startsWith("--replay="))?.slice(9);
  ipcMain.handle("palak:replay", () => (replay ? pathToFileURL(path.resolve(replay)).href : null));
  createWindow();
});

app.on("window-all-closed", () => app.quit());
