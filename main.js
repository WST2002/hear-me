// Hear Me main process: one window, the SmartSpectra IPC bridge, camera-only permission for our own page,
// and the API key (pasted in the app or read from .env; never bundled into the renderer).
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { app, BrowserWindow, ipcMain, session } = require("electron");
const { bindSmartSpectraIpc } = require("@smartspectra/node-sdk/main");
const { readApiKey, saveApiKey } = require("./keystore");

const keyPlaces = () => ({ envFile: path.join(__dirname, ".env"), dataDir: app.getPath("userData") });


function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: "#0f1115",
    title: "Hear Me",
    // --background: never shown (automated test runs); keep the scan timer and camera running anyway.
    show: !process.argv.includes("--background"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, sandbox: false, nodeIntegration: false, backgroundThrottling: false },
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
  ipcMain.handle("hearme:api-key", () => readApiKey(keyPlaces()));
  ipcMain.handle("hearme:save-api-key", (_e, key) => {
    try { saveApiKey(keyPlaces().dataDir, key); return ""; } catch (e) { return e.message; }
  });
  // `npm start -- --replay=clip.mp4` feeds a recorded clip instead of the camera (testing and demos).
  const replay = process.argv.find((a) => a.startsWith("--replay="))?.slice(9);
  ipcMain.handle("hearme:replay", () => (replay ? pathToFileURL(path.resolve(replay)).href : null));
  createWindow();
});

app.on("window-all-closed", () => app.quit());
