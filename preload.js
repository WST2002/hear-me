// SmartSpectra's preload bridge plus one call of our own: fetch the API key from the main process.
require("@smartspectra/node-sdk/preload");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hearMe", {
  apiKey: () => ipcRenderer.invoke("hearme:api-key"),
  replay: () => ipcRenderer.invoke("hearme:replay"),
});
