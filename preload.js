// SmartSpectra's preload bridge plus one call of our own: fetch the API key from the main process.
require("@smartspectra/node-sdk/preload");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("palak", { apiKey: () => ipcRenderer.invoke("palak:api-key") });
