import { contextBridge, ipcRenderer } from "electron";

const api = {
  hidePill: () => ipcRenderer.send("pill:hide"),
} as const;

contextBridge.exposeInMainWorld("desktopStudio", api);

export type DesktopStudioApi = typeof api;
