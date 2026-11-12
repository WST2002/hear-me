// SmartSpectra's preload bridge plus our own calls: the API key (read or save) and the replay clip.
require("@smartspectra/node-sdk/preload");
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hearMe", {
  apiKey: () => ipcRenderer.invoke("hearme:api-key"),
  saveApiKey: (key) => ipcRenderer.invoke("hearme:save-api-key", key),
  forget: () => ipcRenderer.invoke("hearme:forget"),
  replay: () => ipcRenderer.invoke("hearme:replay"),
});
